# A pre-trained package model, before your own photos exist

`sentry_package_bootstrap.pt` is a real, trained YOLOv8n-seg checkpoint —
not a demo, not synthetic data. It exists because the stock model has no
idea what a delivered parcel looks like (see the main [TRAINING.md](../../docs/TRAINING.md)),
and training on your own doorstep photos means waiting for the Outpost to
exist first. This is what's achievable in the meantime.

**Read the whole page before using this in place of the stock model.**
The honest result is: strong at recognizing cardboard boxes, and prone to
false alarms on ordinary doorstep activity unless you raise the confidence
floor. Both facts matter equally.

## Where the data came from

[Ultralytics' own `package-seg` dataset](https://docs.ultralytics.com/datasets/segment/package-seg/) —
2,197 real photos, single `package` class, AGPL-3.0, downloaded directly
from Ultralytics' GitHub releases. It's their official quick-start dataset
for exactly this kind of model, not a scrape of the open web.

**The catch:** every photo is warehouse conveyor-belt sortation footage —
overhead angle, timestamp overlay, boxes on rollers — not a doorstep. It
teaches the model what a cardboard shipping box looks like, which does
transfer. It teaches nothing about porches, people, cars, or pets, because
none of those appear anywhere in the data.

## How it was trained

Three passes, each fixing what the last one got wrong:

1. `yolov8n-seg`, from the stock pretrained weights, fine-tuned for 60
   epochs at 416px on the package-seg data alone, CPU-only, ~5.4 hours.
   Never plateaued — still improving when the epoch cap hit.
2. That checkpoint, fine-tuned for 11 more epochs (~36 minutes, plateaued
   and stopped on its own) on package-seg **plus 128 images from
   Ultralytics' COCO128 sample** — people, cars, streets, animals — added
   as background examples with empty label files. Pass 1 had only ever
   seen boxes-on-a-belt; this exists specifically to show it what *isn't*
   a package.
3. That checkpoint again, for 40 more epochs (~7.9 hours, still improving
   at the cap) at **640px** instead of 416, on an expanded set: the same
   package data, plus ~360 more negative examples from two more real,
   licensed Ultralytics sample sets — [African wildlife](https://docs.ultralytics.com/datasets/detect/african-wildlife/)
   (animals) and [construction-PPE](https://docs.ultralytics.com/datasets/detect/construction-ppe/)
   (people in work gear). Negatives went from ~6% of the training set to
   ~20%. 50 more images from those two sets (25 each) were deliberately
   **held out of training and validation entirely**, kept only to test
   generalization honestly instead of grading the model on data it had
   any exposure to.

Final validation after pass 3 (241 held-out images, box metrics):

| Pass | Precision | Recall | mAP50 | mAP50-95 |
|---|---|---|---|---|
| 1 (package only) | 0.858 | 0.931 | 0.922 | 0.833 |
| 2 (+128 negatives) | 0.881 | 0.890 | 0.920 | 0.812 |
| 3 (+360 more negatives, 640px) | 0.866 | 0.928 | 0.919 | **0.847** |

Real package-detection quality held essentially flat across all three
(mAP50 stayed at ~0.92 throughout) while mAP50-95 — the stricter metric,
sensitive to exactly how tight the boxes are — improved from the
resolution bump. Adding 3x the negative data didn't cost real accuracy.

## The false-positive problem, and the fix

Pass 1, run against `ultralytics/assets/bus.jpg` (a street photo — no
boxes in it at all), reported **5 packages** at the default confidence
floor: a person's puffy jacket, a pair of jeans, a patch of tree, a bus
door icon, a bit of pavement. A model trained on nothing but
boxes-on-a-belt had never seen a person, a car, or a lawn, and
generalized "package" to mean "roughly rectangular thing" on anything
unfamiliar. That matters specifically for Sentry, whose actual deployment
target — a doorstep camera — sees exactly that constantly.

Pass 2 cut it to 1 false positive. But that whole check was two spot-check
photos, not a real test. **Pass 3 got a proper one**: the 50 held-out
images above were never seen in training, by either source dataset, at
any point. Result at the default confidence floor:

- `bus.jpg` / `zidane.jpg`: **0 false positives**, both.
- The 50-image true holdout set: **3 false positives, in 2 of the 50
  images** (a PPE photo at 0.64/0.58, a wildlife photo at 0.40).

Confidence-threshold sweep on the pass-3 weights, against that same
true-holdout set:

| Confidence floor | False positives / 50 holdout images | Real detections across 89-image test set |
|---|---|---|
| 0.25 (default) | 3 | 394 |
| 0.40 | 3 | 368 |
| 0.50 | 2 | 354 |
| 0.65 | **0** | 333 |

`conf >= 0.65` gets a clean zero against images from two domains the
model never trained on, while still recovering *more* real detections
(333) than pass 2 managed even at that same threshold (304 — see pass 2's
history in git blame on this file). Better at both jobs at once.

`outpost_agent.py`'s sensitivity slider maps to a confidence floor of
`0.25` (sensitivity 100) to `0.75` (sensitivity 1) — see `YoloDetector.check()`.
Solving `1.0 - sensitivity/100*0.75 = 0.65` gives sensitivity ≈ 46.7.
**Keep sensitivity at ≤ 45 for this model.** (Correction: an earlier
version of this doc said ≤35 for the pass-1 model at this same threshold —
that arithmetic was wrong; the formula above is the one to trust.) This
is still a real requirement, not a suggestion — a clean 50-image test is
a good sign, not proof there's no false-positive trigger left anywhere.

## Using it

```bash
python3 outpost_agent.py --key YOUR_DEVICE_KEY \
                     --server https://your-backend-url \
                     --model sentry_package_bootstrap.pt
```

The agent will detect the class name (`package`) and skip COCO translation
automatically, same as any custom model. Because it only knows one class,
**it will never report person/vehicle/animal** — those detections disappear
entirely while this model is active. It is not a drop-in replacement for
`yolov8n.pt`; it's a specialist for one class the stock model is weak at.

## What actually fixes this properly

Everything above is a stopgap. The real fix is unchanged from TRAINING.md:
collect photos from your own camera — which naturally include the people,
cars, and pets a stock or bootstrap model needs to learn to *ignore* — and
train on those instead. This checkpoint is a head start for that process
(start `train_sentry_model.ipynb` from this file instead of `yolov8n.pt`
if you want the package class to converge faster with less of your own
data), not a substitute for it.
