# Training your own detection model

## Read this first

**You probably don't need to train anything yet.**

Sentry uses YOLOv8, and the model it downloads on first run has already been
trained on millions of images. Out of the box it recognises:

| Sentry type | Works out of the box? |
|---|---|
| `person` | Yes — this is one of the things it's best at |
| `vehicle` | Yes — cars, trucks, buses, bikes, motorbikes |
| `animal` | Yes — dogs, cats, birds, horses |
| `motion` | Not a model at all — it's frame-by-frame comparison, no training involved |
| `package` | **Poorly.** This is the real gap. |

So three of the five work well already, one isn't machine learning, and one is
genuinely weak. Training is worth doing for **packages** and for cutting down
false alarms specific to your house — not for people or cars.

Also, honestly: you cannot train a model without photos, and you can't get
photos without the camera. This whole page is for after the Outpost arrives.

## Why "package" is hard

The stock model was trained on a standard set of 80 everyday objects. A parcel
on a doorstep isn't one of them. Sentry currently approximates it by treating
"suitcase", "backpack" and "handbag" as packages — see `CLASS_MAP` in
`outpost/outpost_agent.py`. That's a guess, and it shows.

Teaching it what an actual delivered parcel looks like is the single biggest
improvement you can make.

---

## The five steps

### 1. Collect photos (a week or two, no effort)

Run the Outpost agent as normal, with one extra flag:

```bash
python3 outpost_agent.py --key YOUR_DEVICE_KEY \
                     --server https://your-backend-url \
                     --collect ~/sentry-data
```

Every time it detects something it also saves that frame to
`~/sentry-data/images/`. Leave it running.

**How many do you need?** Rough guide:

| Images | What to expect |
|---|---|
| under 100 | Not enough. The model will be worse than the stock one. |
| 200–500 | Enough to beat stock on packages, if enough of them *are* packages |
| 1000+ | Genuinely good |

The count that matters is per class. 500 photos of an empty driveway teach it
nothing about parcels. Make sure you have at least 50–100 real package photos —
put an Amazon box on the step and walk past it a few times if you have to. That
is completely legitimate and it's what everyone does.

### 2. Auto-label them (minutes)

Labelling means marking *where* each object is in each photo. Doing it by hand
is the slow part of machine learning. This script does a first pass for you:

```bash
pip install ultralytics
cd outpost/train
python3 autolabel.py --images ~/sentry-data/images --out ~/sentry-dataset
```

It runs the stock model over your photos and writes label files. It prints a
summary like:

```
Boxes drawn per class:
  motion       0  (expected - 'motion' isn't an object, it has no boxes)
  person      312
  vehicle      48
  package       0  (expected - you'll need to label parcels by hand)
  animal       23
```

### 3. Correct the labels (the actual work — a few hours)

The auto-labeller gets people and cars roughly right, and gets packages
entirely wrong, because it doesn't know what one is. You now fix that.

Use a free tool:

- **[Roboflow](https://roboflow.com)** — runs in the browser, free tier, easily
  the easiest option. Upload the dataset folder, fix the boxes, export as
  "YOLOv8".
- **[LabelImg](https://github.com/HumanSignal/labelImg)** — a desktop app, no
  account needed, a bit clunkier.

What to do:
- Draw boxes around parcels and label them `package`. This is the main job.
- Delete boxes that are plainly wrong (it labelled a bin bag as a person).
- Fix boxes that are in the right place but the wrong class.
- Don't obsess. Roughly right on lots of photos beats perfect on a few.

**There is no shortcut here.** Anyone who tells you training is fully automatic
is skipping this step, and their model doesn't work.

### 4. Train it (20 minutes, free)

Open `outpost/train/train_sentry_model.ipynb` in
[Google Colab](https://colab.research.google.com) — it's free, and it gives you
a GPU, which makes this about 20x faster than your laptop.

Set `Runtime → Change runtime type → T4 GPU`, then work through the cells. They
walk you through uploading your dataset, training, and checking whether the
result is actually any good.

Watch the **mAP50** number per class. If `package` comes out well below the
others, the answer is almost always "collect and label more package photos",
not "train for longer".

### 5. Put it on the Outpost

```bash
scp best.pt YOUR_USER@outpost.local:~/sentry/outpost/sentry_best.pt

# on the Outpost:
python3 outpost_agent.py --key YOUR_DEVICE_KEY \
                     --server https://your-backend-url \
                     --model sentry_best.pt
```

The agent checks the model's class names. If they're Sentry's own five, it uses
them directly and skips the translation step it needs for the stock model. You
should see:

```
[detect] Custom Sentry model, classes: ['animal', 'motion', 'package', 'person', 'vehicle']
```

Drop the `--model` flag any time to go back to the stock model.

---

## How to tell if it actually helped

Run both for a day and compare, rather than trusting the training numbers:

1. Run with `--model sentry_best.pt` for a day. Note how many alerts were
   right and how many were nonsense.
2. Run without it for a day. Same count.

If the custom model isn't clearly better, go back to stock and collect more
data. A model trained on too little data is confidently wrong, which is worse
than being right less often — you'll stop trusting the alerts.

## Common problems

**"My model detects nothing at all."**
Almost always too little training data. Under ~100 images this is the normal
outcome, not a bug.

**"mAP is high but it's useless in real life."**
Your training and validation photos are too similar — probably lots of frames
from the same few minutes. The model memorised those exact scenes. Collect
across different days, weather and times.

**"It's much slower on the Outpost now."**
Check you trained `yolov8n` (nano) and not a bigger variant. Only nano is
really comfortable on small hardware. On a Pi Zero, even that is slow — use
`--no-yolo` and stick to motion detection.

**"Training says CUDA out of memory."**
Lower `batch=16` to `batch=8` or `batch=4` in the training cell.
