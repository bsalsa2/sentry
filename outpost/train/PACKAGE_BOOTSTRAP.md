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

Two passes, not one:

1. `yolov8n-seg`, from the stock pretrained weights, fine-tuned for 60
   epochs at 416px on the package-seg data alone, CPU-only, ~5.4 hours.
   Patience-based early stopping never triggered — it was still improving
   at epoch 60.
2. That checkpoint, fine-tuned for another 11 epochs (~36 minutes, then
   plateaued and stopped on its own) on package-seg **plus 128 images from
   Ultralytics' COCO128 sample** — people, cars, streets, animals, added
   as background examples with empty label files (zero packages in any of
   them). Pass 1 had only ever seen boxes-on-a-belt; this pass exists
   specifically to show it what *isn't* a package.

Final validation after pass 2 (201 held-out images):

| Metric | Box | Mask |
|---|---|---|
| Precision | 0.881 | 0.888 |
| Recall | 0.890 | 0.895 |
| mAP50 | 0.920 | 0.918 |
| mAP50-95 | 0.812 | 0.751 |

Essentially unchanged from pass 1 (mAP50 0.922 → 0.920) — adding negative
examples didn't cost real detection quality.

## The false-positive problem, and the fix

Pass 1, run against `ultralytics/assets/bus.jpg` (a street photo — no
boxes in it at all) at the default confidence floor, reported **5
packages**: a person's puffy jacket, a pair of jeans, a patch of tree, a
bus door icon, a bit of pavement. A model trained on nothing but
boxes-on-a-belt had never seen a person, a car, or a lawn, and
generalized "package" to mean "roughly rectangular thing" on anything
unfamiliar.

That matters *specifically* for Sentry: the deployment target is a
doorstep camera that sees people, cars, and pets constantly. Shipped
naively, pass 1 would have cried wolf on ordinary foot traffic.

Pass 2 (the negative-example fine-tune, described above) cut that same
test to **1 false positive at confidence 0.32** — down from 5, and the
one that's left is easy to filter. Confidence-threshold sweep on the
*current* (pass 2) weights:

| Confidence floor | bus.jpg false positives | Real detections across 89-image test set |
|---|---|---|
| 0.25 (default) | 1 | 376 |
| 0.40 | **0** | 358 |
| 0.65 | 0 | 304 |

Pass 1 needed `conf >= 0.65` to fully suppress that false positive, and
only recovered 326 real detections there. Pass 2 gets a clean zero at
`conf >= 0.40` while keeping *more* real detections (358) than pass 1 ever
managed even at its stricter threshold — strictly better on both axes.

`outpost_agent.py`'s sensitivity slider maps to a confidence floor of
`0.25` (sensitivity 100) to `0.75` (sensitivity 1) — see `YoloDetector.check()`.
**Keep sensitivity at ≤ 80 (floor ≥ 0.40) for this model** until you've
watched it run for a while and confirmed it isn't flagging normal foot
traffic as a package. That's a much wider usable range than pass 1's ≤ 35,
but it's still a real requirement, not a suggestion — one held-out street
photo passing clean is a good sign, not proof there are no others.

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
