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

`yolov8n-seg`, starting from the stock pretrained weights, fine-tuned for
60 epochs at 416px, CPU-only, ~5.4 hours wall time (patience-based early
stopping never triggered — it was still improving at epoch 60, so a GPU
run with more epochs would likely do better still).

Final validation (188 held-out images):

| Metric | Box | Mask |
|---|---|---|
| Precision | 0.858 | 0.861 |
| Recall | 0.931 | 0.934 |
| mAP50 | 0.922 | 0.924 |
| mAP50-95 | 0.833 | 0.773 |

Those numbers are real and strong — on images from the same warehouse
distribution the model was trained on.

## The false-positive problem, and the fix

Run against `ultralytics/assets/bus.jpg` (a street photo — no boxes in
it at all) at the default confidence floor, it reported **5 packages**:
a person's puffy jacket, a pair of jeans, a patch of tree, a bus door
icon, a bit of pavement. A model trained on nothing but boxes-on-a-belt
has never seen a person, a car, or a lawn, and generalizes "package" to
mean "roughly rectangular thing" when shown a scene it doesn't recognize.

That matters *specifically* for Sentry: the deployment target is a
doorstep camera that sees people, cars, and pets constantly. Shipped
naively, this model would cry wolf on ordinary foot traffic.

The fix that actually works: **raise the confidence floor.** At
`conf >= 0.65`, the bus.jpg false positives drop to zero while the model
still recovers 326 of the 389 real detections it found across the full
89-image held-out test set at the default floor. Precision over recall —
exactly right for an alert you don't want to stop trusting.

`outpost_agent.py`'s sensitivity slider maps to a confidence floor of
`0.25` (sensitivity 100) to `0.75` (sensitivity 1) — see `YoloDetector.check()`.
**If you use this model, keep sensitivity low (≤ ~35, i.e. floor ≥ 0.65) until
you've watched it run for a while and confirmed it isn't flagging normal
foot traffic as a package.**

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
