import os
import random
import copy
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms, models
from PIL import Image, ImageFile

from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix

import matplotlib.pyplot as plt
import seaborn as sns

from tqdm import tqdm


# ============================================================
# CONFIGURATION
# ============================================================

# IMPORTANT:
# This folder must directly contain the 9 class folders.
DATASET_DIR = r"C:\software dev project\dataset\ds\DATASET\dataset"

# Project root:
# C:\software dev project\community-issue-reporting
PROJECT_DIR = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

# IMPORTANT:
# Save the trained model directly where Flask expects it.
BACKEND_ML_DIR = os.path.join(
    PROJECT_DIR,
    "backend",
    "ml"
)

os.makedirs(BACKEND_ML_DIR, exist_ok=True)

MODEL_PATH = os.path.join(
    BACKEND_ML_DIR,
    "best_model.pth"
)

CLASSES_PATH = os.path.join(
    BACKEND_ML_DIR,
    "classes.txt"
)

# Keep training reports inside ml_training/model
REPORT_DIR = os.path.join(
    PROJECT_DIR,
    "ml_training",
    "model"
)

os.makedirs(REPORT_DIR, exist_ok=True)

REPORT_PATH = os.path.join(
    REPORT_DIR,
    "classification_report.txt"
)

CONFUSION_PATH = os.path.join(
    REPORT_DIR,
    "confusion_matrix.png"
)

CURVES_PATH = os.path.join(
    REPORT_DIR,
    "training_curves.png"
)


# ============================================================
# TRAINING SETTINGS
# ============================================================

IMAGE_SIZE = 224
BATCH_SIZE = 32

# You can use 15 for better accuracy.
# Early stopping below can finish earlier if validation stops improving.
EPOCHS = 15

LEARNING_RATE = 0.0003
RANDOM_SEED = 42

# Stop if validation loss does not improve for this many epochs.
EARLY_STOPPING_PATIENCE = 4


# ============================================================
# REPRODUCIBILITY
# ============================================================

random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)
torch.manual_seed(RANDOM_SEED)

if torch.cuda.is_available():
    torch.cuda.manual_seed_all(RANDOM_SEED)


# ============================================================
# DEVICE
# ============================================================

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


print("=" * 70)
print("COMMUNITY ISSUE REPORTING - IMAGE CLASSIFICATION")
print("=" * 70)

print("\nDataset path:")
print(DATASET_DIR)

print("\nDevice:")
print(device)

if torch.cuda.is_available():
    print("GPU:")
    print(torch.cuda.get_device_name(0))

    print(
        f"GPU Memory: "
        f"{torch.cuda.get_device_properties(0).total_memory / (1024 ** 3):.2f} GB"
    )

print("\nModel will be saved to:")
print(MODEL_PATH)


# ============================================================
# CHECK DATASET DIRECTORY
# ============================================================

if not os.path.isdir(DATASET_DIR):

    raise FileNotFoundError(
        "\nDataset directory was not found.\n\n"
        f"Expected:\n{DATASET_DIR}\n"
    )


# ============================================================
# IMAGE VALIDATION
# ============================================================

ImageFile.LOAD_TRUNCATED_IMAGES = True

VALID_EXTENSIONS = (
    ".jpg",
    ".jpeg",
    ".png",
    ".bmp",
    ".webp"
)


def is_valid_image(path):

    if not path.lower().endswith(VALID_EXTENSIONS):
        return False

    # Ignore macOS metadata
    if os.path.basename(path).startswith("._"):
        return False

    if "__MACOSX" in path:
        return False

    try:

        with Image.open(path) as image:
            image.verify()

        return True

    except Exception:

        return False


# ============================================================
# DISCOVER CLASS FOLDERS
# ============================================================

print("\nScanning dataset...")

class_names = []

for name in sorted(os.listdir(DATASET_DIR)):

    full_path = os.path.join(
        DATASET_DIR,
        name
    )

    if not os.path.isdir(full_path):
        continue

    # Ignore hidden folders
    if name.startswith("."):
        continue

    # Ignore macOS metadata
    if name == "__MACOSX":
        continue

    class_names.append(name)


if len(class_names) < 2:

    raise RuntimeError(
        "\nCould not find enough class folders.\n\n"
        "Expected folders such as:\n"
        "cardboard\n"
        "glass\n"
        "metal\n"
        "paper\n"
        "plastic\n"
        "pothole\n"
        "street light\n"
        "trash\n"
        "water leakage\n"
    )


print("\nClasses detected:")

for index, class_name in enumerate(class_names):

    print(
        f"{index}: {class_name}"
    )


# ============================================================
# COLLECT VALID IMAGES
# ============================================================

samples = []
invalid_images = []

for class_index, class_name in enumerate(class_names):

    class_dir = os.path.join(
        DATASET_DIR,
        class_name
    )

    class_count = 0

    for root, dirs, files in os.walk(class_dir):

        # Ignore macOS folders
        dirs[:] = [
            d for d in dirs
            if d != "__MACOSX"
            and not d.startswith(".")
        ]

        for filename in files:

            path = os.path.join(
                root,
                filename
            )

            if is_valid_image(path):

                samples.append(
                    (
                        path,
                        class_index
                    )
                )

                class_count += 1

            else:

                if filename.lower().endswith(
                    VALID_EXTENSIONS
                ):
                    invalid_images.append(path)

    print(
        f"{class_name:20s}: {class_count} images"
    )


if len(samples) == 0:

    raise RuntimeError(
        "\nNo valid images were found."
    )


print(
    f"\nTotal valid images: {len(samples)}"
)

if invalid_images:

    print(
        f"Invalid images ignored: "
        f"{len(invalid_images)}"
    )


# ============================================================
# CHECK CLASS DISTRIBUTION
# ============================================================

labels = np.array(
    [label for _, label in samples]
)

print("\nComplete class distribution:")

for class_index, class_name in enumerate(class_names):

    count = int(
        np.sum(labels == class_index)
    )

    print(
        f"{class_name:20s}: {count}"
    )


# ============================================================
# STRATIFIED SPLIT
# ============================================================

indices = np.arange(
    len(samples)
)

try:

    train_indices, temp_indices = train_test_split(
        indices,
        test_size=0.30,
        random_state=RANDOM_SEED,
        stratify=labels
    )

    temp_labels = labels[temp_indices]

    val_indices, test_indices = train_test_split(
        temp_indices,
        test_size=0.50,
        random_state=RANDOM_SEED,
        stratify=temp_labels
    )

except ValueError as error:

    raise RuntimeError(
        "\nDataset cannot be split correctly.\n"
        "Make sure every class contains enough images.\n\n"
        f"Original error: {error}"
    )


print("\nDataset split:")

print(
    f"Training   : {len(train_indices)}"
)

print(
    f"Validation : {len(val_indices)}"
)

print(
    f"Testing    : {len(test_indices)}"
)


# ============================================================
# TRANSFORMS
# ============================================================

train_transform = transforms.Compose([

    transforms.Resize(
        (IMAGE_SIZE, IMAGE_SIZE)
    ),

    transforms.RandomHorizontalFlip(
        p=0.5
    ),

    transforms.RandomRotation(
        degrees=10
    ),

    transforms.ColorJitter(
        brightness=0.2,
        contrast=0.2,
        saturation=0.2
    ),

    transforms.ToTensor(),

    transforms.Normalize(
        mean=[
            0.485,
            0.456,
            0.406
        ],
        std=[
            0.229,
            0.224,
            0.225
        ]
    )
])


test_transform = transforms.Compose([

    transforms.Resize(
        (IMAGE_SIZE, IMAGE_SIZE)
    ),

    transforms.ToTensor(),

    transforms.Normalize(
        mean=[
            0.485,
            0.456,
            0.406
        ],
        std=[
            0.229,
            0.224,
            0.225
        ]
    )
])


# ============================================================
# CUSTOM DATASET
# ============================================================

class CivicDataset(Dataset):

    def __init__(
        self,
        samples,
        transform=None
    ):

        self.samples = samples
        self.transform = transform

    def __len__(self):

        return len(self.samples)

    def __getitem__(self, index):

        path, label = self.samples[index]

        try:

            image = Image.open(path).convert(
                "RGB"
            )

        except Exception as error:

            raise RuntimeError(
                f"\nCould not open image:\n{path}\n\n"
                f"Error: {error}"
            )

        if self.transform:

            image = self.transform(image)

        return image, label


# ============================================================
# CREATE DATASETS
# ============================================================

train_samples = [
    samples[i]
    for i in train_indices
]

val_samples = [
    samples[i]
    for i in val_indices
]

test_samples = [
    samples[i]
    for i in test_indices
]


train_dataset = CivicDataset(
    train_samples,
    train_transform
)

val_dataset = CivicDataset(
    val_samples,
    test_transform
)

test_dataset = CivicDataset(
    test_samples,
    test_transform
)


# ============================================================
# CLASS IMBALANCE
# ============================================================

train_labels = np.array(
    [label for _, label in train_samples]
)

class_counts = np.bincount(
    train_labels,
    minlength=len(class_names)
)

print("\nTraining class distribution:")

for i, count in enumerate(class_counts):

    print(
        f"{class_names[i]:20s}: {count}"
    )


# ============================================================
# WEIGHTED SAMPLING
# ============================================================

class_weights = np.zeros(
    len(class_names),
    dtype=np.float32
)

for i in range(len(class_names)):

    if class_counts[i] > 0:

        class_weights[i] = (
            len(train_labels)
            /
            class_counts[i]
        )


sample_weights = np.array([
    class_weights[label]
    for label in train_labels
])


sampler = torch.utils.data.WeightedRandomSampler(

    weights=torch.DoubleTensor(
        sample_weights
    ),

    num_samples=len(
        sample_weights
    ),

    replacement=True
)


# ============================================================
# DATALOADERS
# ============================================================

train_loader = DataLoader(

    train_dataset,

    batch_size=BATCH_SIZE,

    sampler=sampler,

    num_workers=0,

    pin_memory=torch.cuda.is_available()
)


val_loader = DataLoader(

    val_dataset,

    batch_size=BATCH_SIZE,

    shuffle=False,

    num_workers=0,

    pin_memory=torch.cuda.is_available()
)


test_loader = DataLoader(

    test_dataset,

    batch_size=BATCH_SIZE,

    shuffle=False,

    num_workers=0,

    pin_memory=torch.cuda.is_available()
)


# ============================================================
# SAVE CLASS NAMES
# ============================================================

with open(
    CLASSES_PATH,
    "w",
    encoding="utf-8"
) as file:

    for class_name in class_names:

        file.write(
            class_name + "\n"
        )


print("\nClasses saved to:")
print(CLASSES_PATH)


# ============================================================
# MODEL
# ============================================================

print(
    "\nLoading EfficientNet-B0..."
)

weights = models.EfficientNet_B0_Weights.DEFAULT

model = models.efficientnet_b0(
    weights=weights
)


# Freeze feature extractor

for parameter in model.features.parameters():

    parameter.requires_grad = False


input_features = (
    model.classifier[1].in_features
)


model.classifier = nn.Sequential(

    nn.Dropout(
        p=0.3
    ),

    nn.Linear(
        input_features,
        len(class_names)
    )
)


model = model.to(device)


# ============================================================
# LOSS
# ============================================================

criterion = nn.CrossEntropyLoss()


# ============================================================
# OPTIMIZER
# ============================================================

optimizer = torch.optim.AdamW(

    model.classifier.parameters(),

    lr=LEARNING_RATE,

    weight_decay=1e-4
)


# ============================================================
# LEARNING RATE SCHEDULER
# ============================================================

scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(

    optimizer,

    mode="min",

    factor=0.5,

    patience=2
)


# ============================================================
# TRAINING HISTORY
# ============================================================

history = {

    "train_loss": [],
    "val_loss": [],
    "train_accuracy": [],
    "val_accuracy": []

}


best_val_loss = float("inf")

best_model_weights = copy.deepcopy(
    model.state_dict()
)

epochs_without_improvement = 0


# ============================================================
# TRAINING LOOP
# ============================================================

for epoch in range(EPOCHS):

    print(
        f"\nEpoch {epoch + 1}/{EPOCHS}"
    )

    print("-" * 60)


    # --------------------------------------------------------
    # TRAIN
    # --------------------------------------------------------

    model.train()

    running_loss = 0.0

    correct = 0

    total = 0


    progress = tqdm(
        train_loader,
        desc="Training"
    )


    for images, labels_batch in progress:

        images = images.to(
            device,
            non_blocking=True
        )

        labels_batch = labels_batch.to(
            device,
            non_blocking=True
        )


        optimizer.zero_grad()


        outputs = model(
            images
        )


        loss = criterion(
            outputs,
            labels_batch
        )


        loss.backward()

        optimizer.step()


        running_loss += (
            loss.item()
            *
            images.size(0)
        )


        predictions = torch.argmax(
            outputs,
            dim=1
        )


        correct += (
            predictions == labels_batch
        ).sum().item()


        total += labels_batch.size(0)


        progress.set_postfix(
            loss=f"{loss.item():.4f}"
        )


    train_loss = (
        running_loss / total
    )

    train_accuracy = (
        correct / total
    )


    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    model.eval()

    validation_loss = 0.0

    correct = 0

    total = 0


    with torch.no_grad():

        for images, labels_batch in val_loader:

            images = images.to(
                device,
                non_blocking=True
            )

            labels_batch = labels_batch.to(
                device,
                non_blocking=True
            )


            outputs = model(
                images
            )


            loss = criterion(
                outputs,
                labels_batch
            )


            validation_loss += (
                loss.item()
                *
                images.size(0)
            )


            predictions = torch.argmax(
                outputs,
                dim=1
            )


            correct += (
                predictions == labels_batch
            ).sum().item()


            total += labels_batch.size(0)


    val_loss = (
        validation_loss / total
    )

    val_accuracy = (
        correct / total
    )


    scheduler.step(
        val_loss
    )


    # --------------------------------------------------------
    # SAVE HISTORY
    # --------------------------------------------------------

    history[
        "train_loss"
    ].append(train_loss)

    history[
        "val_loss"
    ].append(val_loss)

    history[
        "train_accuracy"
    ].append(train_accuracy)

    history[
        "val_accuracy"
    ].append(val_accuracy)


    print(
        f"Train Loss     : {train_loss:.4f}"
    )

    print(
        f"Train Accuracy : "
        f"{train_accuracy * 100:.2f}%"
    )

    print(
        f"Val Loss       : {val_loss:.4f}"
    )

    print(
        f"Val Accuracy   : "
        f"{val_accuracy * 100:.2f}%"
    )


    # --------------------------------------------------------
    # SAVE BEST MODEL
    # --------------------------------------------------------

    if val_loss < best_val_loss:

        best_val_loss = val_loss

        best_model_weights = copy.deepcopy(
            model.state_dict()
        )

        epochs_without_improvement = 0


        checkpoint = {

            "model_state_dict":
                model.state_dict(),

            "classes":
                class_names,

            "image_size":
                IMAGE_SIZE,

            "model_name":
                "efficientnet_b0"

        }


        # Save to temporary file first
        # This prevents an interrupted write
        # from leaving a corrupt/empty .pth file.

        TEMP_MODEL_PATH = (
            MODEL_PATH + ".tmp"
        )


        torch.save(
            checkpoint,
            TEMP_MODEL_PATH
        )


        # Verify the temporary file exists
        # and is not empty.

        if (
            os.path.exists(TEMP_MODEL_PATH)
            and
            os.path.getsize(TEMP_MODEL_PATH) > 0
        ):

            os.replace(
                TEMP_MODEL_PATH,
                MODEL_PATH
            )

            print(
                "\nBest model saved successfully."
            )

            print(
                f"Model size: "
                f"{os.path.getsize(MODEL_PATH) / (1024 * 1024):.2f} MB"
            )

        else:

            raise RuntimeError(
                "\nERROR: Model checkpoint "
                "was not written correctly."
            )


    else:

        epochs_without_improvement += 1

        print(
            f"\nNo validation improvement."
        )

        print(
            f"Early stopping counter: "
            f"{epochs_without_improvement}/"
            f"{EARLY_STOPPING_PATIENCE}"
        )


    # --------------------------------------------------------
    # EARLY STOPPING
    # --------------------------------------------------------

    if (
        epochs_without_improvement
        >=
        EARLY_STOPPING_PATIENCE
    ):

        print(
            "\nEarly stopping triggered."
        )

        break


# ============================================================
# MAKE SURE MODEL EXISTS
# ============================================================

if not os.path.exists(MODEL_PATH):

    raise RuntimeError(
        "\nTraining finished but "
        "best_model.pth was not created."
    )


if os.path.getsize(MODEL_PATH) == 0:

    raise RuntimeError(
        "\nCRITICAL ERROR:\n"
        "best_model.pth exists but is 0 bytes."
    )


print("\nVerified model file:")

print(
    f"{MODEL_PATH}"
)

print(
    f"Model size: "
    f"{os.path.getsize(MODEL_PATH) / (1024 * 1024):.2f} MB"
)


# ============================================================
# LOAD BEST MODEL
# ============================================================

model.load_state_dict(
    best_model_weights
)

model.eval()


# ============================================================
# TEST
# ============================================================

print(
    "\nEvaluating test set..."
)

all_predictions = []

all_labels = []


with torch.no_grad():

    for images, labels_batch in tqdm(
        test_loader,
        desc="Testing"
    ):

        images = images.to(
            device
        )


        outputs = model(
            images
        )


        predictions = torch.argmax(
            outputs,
            dim=1
        )


        all_predictions.extend(
            predictions.cpu().numpy()
        )

        all_labels.extend(
            labels_batch.numpy()
        )


# ============================================================
# CLASSIFICATION REPORT
# ============================================================

report = classification_report(

    all_labels,

    all_predictions,

    labels=list(
        range(len(class_names))
    ),

    target_names=class_names,

    zero_division=0
)


print(
    "\n" + report
)


with open(
    REPORT_PATH,
    "w",
    encoding="utf-8"
) as file:

    file.write(report)


# ============================================================
# CONFUSION MATRIX
# ============================================================

matrix = confusion_matrix(

    all_labels,

    all_predictions,

    labels=list(
        range(len(class_names))
    )
)


plt.figure(
    figsize=(12, 10)
)

sns.heatmap(

    matrix,

    annot=True,

    fmt="d",

    xticklabels=class_names,

    yticklabels=class_names
)


plt.xlabel(
    "Predicted"
)

plt.ylabel(
    "Actual"
)

plt.title(
    "Community Issue Classification"
)

plt.tight_layout()

plt.savefig(
    CONFUSION_PATH,
    dpi=300
)

plt.close()


# ============================================================
# TRAINING CURVES
# ============================================================

actual_epochs = len(
    history["train_accuracy"]
)

epochs_range = range(
    1,
    actual_epochs + 1
)


plt.figure(
    figsize=(10, 6)
)

plt.plot(

    epochs_range,

    history[
        "train_accuracy"
    ],

    label="Training Accuracy"
)


plt.plot(

    epochs_range,

    history[
        "val_accuracy"
    ],

    label="Validation Accuracy"
)


plt.xlabel(
    "Epoch"
)

plt.ylabel(
    "Accuracy"
)

plt.title(
    "Training vs Validation Accuracy"
)

plt.legend()

plt.grid()

plt.tight_layout()

plt.savefig(
    CURVES_PATH,
    dpi=300
)

plt.close()


# ============================================================
# FINAL VERIFICATION
# ============================================================

print("\n" + "=" * 70)

print(
    "TRAINING COMPLETE"
)

print("=" * 70)


print(
    "\nMODEL FILE:"
)

print(
    MODEL_PATH
)

print(
    f"Size: "
    f"{os.path.getsize(MODEL_PATH) / (1024 * 1024):.2f} MB"
)


print(
    "\nCLASSES FILE:"
)

print(
    CLASSES_PATH
)


print(
    "\nREPORT:"
)

print(
    REPORT_PATH
)


print(
    "\nCONFUSION MATRIX:"
)

print(
    CONFUSION_PATH
)


print(
    "\nTRAINING CURVES:"
)

print(
    CURVES_PATH
)


print(
    "\nDetected classes:"
)

for class_name in class_names:

    print(
        f"  - {class_name}"
    )


print(
    "\nSUCCESS: best_model.pth is ready for Flask."
)

print(
    "The backend can now load:"
)

print(
    MODEL_PATH
)
