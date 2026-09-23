import os
from PIL import Image
from collections import Counter

DATASET_DIR = r"C:\software dev project\dataset\ds\DATASET\dataset"

VALID_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".bmp",
    ".webp"
}

def analyze_dataset():
    print("=" * 70)
    print("COMMUNITY ISSUE REPORTING - DATASET ANALYSIS")
    print("=" * 70)

    if not os.path.exists(DATASET_DIR):
        print(f"Dataset not found:")
        print(DATASET_DIR)
        return

    classes = sorted(
        folder for folder in os.listdir(DATASET_DIR)
        if os.path.isdir(os.path.join(DATASET_DIR, folder))
    )

    print(f"\nNumber of classes: {len(classes)}")
    print("\nClasses:")

    for i, class_name in enumerate(classes):
        print(f"{i}: {class_name}")

    print("\n" + "-" * 70)

    total_images = 0
    corrupted = []
    dimensions = Counter()

    for class_name in classes:

        class_path = os.path.join(DATASET_DIR, class_name)

        count = 0

        for filename in os.listdir(class_path):

            file_path = os.path.join(class_path, filename)

            if not os.path.isfile(file_path):
                continue

            extension = os.path.splitext(filename)[1].lower()

            if extension not in VALID_EXTENSIONS:
                continue

            try:
                with Image.open(file_path) as image:

                    image.verify()

                with Image.open(file_path) as image:

                    dimensions[image.size] += 1

                count += 1
                total_images += 1

            except Exception as e:

                corrupted.append({
                    "class": class_name,
                    "file": filename,
                    "error": str(e)
                })

        print(f"{class_name:20s} : {count:6d} images")

    print("-" * 70)
    print(f"Total images: {total_images}")

    print("\nMost common image dimensions:")

    for size, count in dimensions.most_common(10):
        print(f"{size}: {count}")

    print("\nCorrupted images:")

    if corrupted:
        for item in corrupted[:20]:
            print(
                f"{item['class']} / "
                f"{item['file']} / "
                f"{item['error']}"
            )

        if len(corrupted) > 20:
            print(f"...and {len(corrupted) - 20} more.")

    else:
        print("No corrupted images detected.")

    print("\nDataset analysis complete.")


if __name__ == "__main__":
    analyze_dataset()
