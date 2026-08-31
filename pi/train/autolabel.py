#!/usr/bin/env python3
"""
Turn collected camera images into a labelled YOLO dataset - automatically.

Training a model needs *boxes*: for every image, a note saying "there is a
person here, at these coordinates". Drawing those by hand is the slow, boring
part of machine learning, and it is why most people never train anything.

This script does the first pass for you. It runs the stock YOLOv8 model over
your collected images and writes out label files in YOLO format. You then only
have to *correct* what it got wrong, which is far quicker than starting from a
blank image.

Usage:

    pip install ultralytics
    python3 autolabel.py --images ../collected/images --out ../dataset

What you get:

    dataset/
      images/train/...      80% of your photos
      images/val/...        the other 20%, used to check the model honestly
      labels/train/...      one .txt per image, same filename
      labels/val/...
      dataset.yaml          tells the trainer where everything is

Important: the stock model does NOT know what a delivered parcel looks like -
there is no "package" class in what it was trained on. Those you must label
yourself. Everything else it will usually get roughly right.
"""

import argparse
import random
import shutil
import sys
from pathlib import Path

# Sentry's five classes. The ORDER MATTERS: label files store the class as a
# number, and that number is an index into this list.
SENTRY_CLASSES = ["motion", "person", "vehicle", "package", "animal"]

# Which of the stock model's 80 class names map onto ours.
COCO_TO_SENTRY = {
    "person": "person",
    "car": "vehicle", "truck": "vehicle", "bus": "vehicle",
    "motorcycle": "vehicle", "bicycle": "vehicle",
    "dog": "animal", "cat": "animal", "bird": "animal", "horse": "animal",
    # Rough stand-ins for a parcel. Expect to fix a lot of these by hand.
    "suitcase": "package", "backpack": "package", "handbag": "package",
}


def main() -> int:
    parser = argparse.ArgumentParser(description="Auto-label camera images for training.")
    parser.add_argument("--images", required=True, help="folder of collected .jpg files")
    parser.add_argument("--out", required=True, help="where to build the dataset")
    parser.add_argument("--model", default="yolov8n.pt", help="model to label with")
    parser.add_argument(
        "--conf", type=float, default=0.35,
        help="only label things the model is at least this sure about (0-1)",
    )
    parser.add_argument(
        "--val-split", type=float, default=0.2,
        help="fraction of images held back to test the model on (default 0.2)",
    )
    parser.add_argument("--seed", type=int, default=42, help="keeps the split repeatable")
    args = parser.parse_args()

    try:
        from ultralytics import YOLO
    except ImportError:
        print("Install ultralytics first:  pip install ultralytics")
        return 1

    image_dir = Path(args.images)
    if not image_dir.is_dir():
        print(f"No such folder: {image_dir}")
        return 1

    images = sorted(
        p for p in image_dir.iterdir()
        if p.suffix.lower() in {".jpg", ".jpeg", ".png"}
    )
    if not images:
        print(f"No images found in {image_dir}.")
        print("Run the Pi agent with --collect first to gather some.")
        return 1

    print(f"Found {len(images)} images. Loading {args.model}...")
    model = YOLO(args.model)

    # --- Build the folder layout the trainer expects ---
    out = Path(args.out)
    for split in ("train", "val"):
        (out / "images" / split).mkdir(parents=True, exist_ok=True)
        (out / "labels" / split).mkdir(parents=True, exist_ok=True)

    # Shuffle once, with a fixed seed, so re-running gives the same split.
    random.Random(args.seed).shuffle(images)
    split_at = int(len(images) * (1 - args.val_split))

    counts = {name: 0 for name in SENTRY_CLASSES}
    empty = 0

    for index, image_path in enumerate(images):
        split = "train" if index < split_at else "val"

        # Copy the photo into the dataset.
        shutil.copy2(image_path, out / "images" / split / image_path.name)

        results = model(str(image_path), verbose=False, conf=args.conf)

        lines = []
        for result in results:
            for box in result.boxes:
                coco_name = result.names[int(box.cls)]
                sentry_name = COCO_TO_SENTRY.get(coco_name)
                if sentry_name is None:
                    continue  # something we don't care about, e.g. a chair

                class_index = SENTRY_CLASSES.index(sentry_name)

                # YOLO wants: class cx cy w h, each as a fraction of the image
                # size. xywhn is already normalised for us.
                cx, cy, w, h = box.xywhn[0].tolist()
                lines.append(f"{class_index} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}")
                counts[sentry_name] += 1

        if not lines:
            empty += 1

        # Write the label file even when empty: an image with nothing in it is
        # a valid, useful training example ("this is what boring looks like").
        label_path = out / "labels" / split / (image_path.stem + ".txt")
        label_path.write_text("\n".join(lines) + ("\n" if lines else ""))

        if (index + 1) % 50 == 0:
            print(f"  labelled {index + 1}/{len(images)}")

    # --- The config file the trainer reads ---
    names_block = "\n".join(f"  {i}: {n}" for i, n in enumerate(SENTRY_CLASSES))
    (out / "dataset.yaml").write_text(
        "# Auto-generated by autolabel.py - describes the dataset for YOLO.\n"
        f"path: {out.resolve()}\n"
        "train: images/train\n"
        "val: images/val\n"
        "\n"
        "names:\n"
        f"{names_block}\n"
    )

    # --- Report ---
    print("\nDone.")
    print(f"  dataset:   {out.resolve()}")
    print(f"  train/val: {split_at} / {len(images) - split_at} images")
    print(f"  no objects found in: {empty} images")
    print("\nBoxes drawn per class:")
    for name in SENTRY_CLASSES:
        note = ""
        if name == "motion":
            note = "  (expected - 'motion' isn't an object, it has no boxes)"
        elif name == "package" and counts[name] == 0:
            note = "  (expected - you'll need to label parcels by hand)"
        print(f"  {name:<8} {counts[name]:>5}{note}")

    print(
        "\nNext: open the dataset in a labelling tool (Roboflow, free, or "
        "LabelImg) and fix what's wrong before training. See docs/TRAINING.md."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
