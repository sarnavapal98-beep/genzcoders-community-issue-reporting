import os
import argparse

import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image


# ============================================================
# PATHS
# ============================================================

# community-issue-reporting/
PROJECT_DIR = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

# ============================================================
# IMPORTANT:
# The new train.py saves the model here:
#
# community-issue-reporting/
# └── backend/
#     └── ml/
#         ├── best_model.pth
#         └── classes.txt
# ============================================================

MODEL_DIR = os.path.join(
    PROJECT_DIR,
    "backend",
    "ml"
)

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "best_model.pth"
)

CLASSES_PATH = os.path.join(
    MODEL_DIR,
    "classes.txt"
)


IMAGE_SIZE = 224


# ============================================================
# DEVICE
# ============================================================

device = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)

print("\nDevice:", device)


# ============================================================
# CHECK MODEL FILE
# ============================================================

if not os.path.exists(MODEL_PATH):

    raise FileNotFoundError(
        f"\nModel file not found:\n"
        f"{MODEL_PATH}\n\n"
        "Run the training script first:\n"
        "python ml_training\\train.py"
    )


# ============================================================
# CHECK CLASSES FILE
# ============================================================

if not os.path.exists(CLASSES_PATH):

    raise FileNotFoundError(
        f"\nClasses file not found:\n"
        f"{CLASSES_PATH}\n\n"
        "Run the training script first:\n"
        "python ml_training\\train.py"
    )


# ============================================================
# CHECK FILE SIZE
# ============================================================

model_size = os.path.getsize(MODEL_PATH)

if model_size == 0:

    raise RuntimeError(
        f"\nThe model file exists but is EMPTY:\n"
        f"{MODEL_PATH}\n\n"
        "The model was not saved correctly."
    )


print(
    f"\nModel found:"
    f"\n{MODEL_PATH}"
)

print(
    f"Model size: "
    f"{model_size / (1024 * 1024):.2f} MB"
)


# ============================================================
# LOAD CLASSES
# ============================================================

with open(
    CLASSES_PATH,
    "r",
    encoding="utf-8"
) as file:

    classes = [
        line.strip()
        for line in file
        if line.strip()
    ]


if len(classes) < 2:

    raise RuntimeError(
        "\nInvalid classes.txt file."
    )


print("\nClasses loaded:")

for index, class_name in enumerate(classes):

    print(
        f"{index}: {class_name}"
    )


# ============================================================
# LOAD CHECKPOINT
# ============================================================

print(
    "\nLoading trained model..."
)

try:

    checkpoint = torch.load(
        MODEL_PATH,
        map_location=device
    )

except Exception as error:

    raise RuntimeError(
        f"\nCould not load model:\n"
        f"{MODEL_PATH}\n\n"
        f"Error: {error}"
    )


# ============================================================
# CREATE EFFICIENTNET-B0
# ============================================================

model = models.efficientnet_b0(
    weights=None
)


input_features = (
    model.classifier[1].in_features
)


# This must match the architecture used during training.
model.classifier = nn.Sequential(

    nn.Dropout(
        p=0.3
    ),

    nn.Linear(
        input_features,
        len(classes)
    )
)


# ============================================================
# LOAD STATE DICTIONARY
# ============================================================

if isinstance(checkpoint, dict):

    if "model_state_dict" in checkpoint:

        state_dict = (
            checkpoint["model_state_dict"]
        )

    elif "state_dict" in checkpoint:

        state_dict = (
            checkpoint["state_dict"]
        )

    else:

        state_dict = checkpoint

else:

    state_dict = checkpoint


try:

    model.load_state_dict(
        state_dict
    )

except Exception as error:

    raise RuntimeError(
        "\nModel architecture does not match "
        "the saved checkpoint.\n\n"
        f"Error: {error}"
    )


# ============================================================
# MOVE MODEL TO DEVICE
# ============================================================

model = model.to(device)

model.eval()


print(
    "\nModel loaded successfully."
)


# ============================================================
# IMAGE TRANSFORMATION
# ============================================================

transform = transforms.Compose([

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
# PREDICTION FUNCTION
# ============================================================

def predict_image(
    image_path,
    top_k=3
):

    # --------------------------------------------------------
    # Check image
    # --------------------------------------------------------

    if not os.path.exists(image_path):

        raise FileNotFoundError(
            f"\nImage not found:\n"
            f"{image_path}"
        )


    # --------------------------------------------------------
    # Open image
    # --------------------------------------------------------

    try:

        image = Image.open(
            image_path
        ).convert("RGB")

    except Exception as error:

        raise RuntimeError(
            f"\nCould not open image:\n"
            f"{image_path}\n\n"
            f"Error: {error}"
        )


    # --------------------------------------------------------
    # Transform image
    # --------------------------------------------------------

    image_tensor = transform(
        image
    )


    image_tensor = (
        image_tensor
        .unsqueeze(0)
        .to(device)
    )


    # --------------------------------------------------------
    # Prediction
    # --------------------------------------------------------

    with torch.no_grad():

        outputs = model(
            image_tensor
        )

        probabilities = (
            torch.softmax(
                outputs,
                dim=1
            )[0]
        )


    # --------------------------------------------------------
    # Top K
    # --------------------------------------------------------

    top_k = min(
        top_k,
        len(classes)
    )


    values, indices = torch.topk(
        probabilities,
        top_k
    )


    # --------------------------------------------------------
    # Prepare results
    # --------------------------------------------------------

    predictions = []


    for probability, index in zip(
        values,
        indices
    ):

        predictions.append({

            "class":
                classes[
                    index.item()
                ],

            "confidence":
                float(
                    probability.item()
                    * 100
                )
        })


    return predictions


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    parser = argparse.ArgumentParser(

        description=
        "Community Issue Image Classifier"
    )


    parser.add_argument(

        "--image",

        required=True,

        help=
        "Path to image for prediction"
    )


    args = parser.parse_args()


    # --------------------------------------------------------
    # Run prediction
    # --------------------------------------------------------

    results = predict_image(
        args.image,
        top_k=3
    )


    # --------------------------------------------------------
    # Display results
    # --------------------------------------------------------

    print("\n")

    print(
        "=" * 60
    )

    print(
        "COMMUNITY ISSUE IMAGE PREDICTION"
    )

    print(
        "=" * 60
    )


    print(
        f"\nImage:"
        f"\n{args.image}"
    )


    print(
        f"\nDevice:"
        f"\n{device}"
    )


    print(
        "\nPredicted category:"
    )


    print(
        f"  {results[0]['class']}"
        f"  ({results[0]['confidence']:.2f}%)"
    )


    print(
        "\nTop predictions:"
    )


    for index, result in enumerate(
        results,
        start=1
    ):

        print(

            f"{index}. "
            f"{result['class']} "
            f"- "
            f"{result['confidence']:.2f}%"

        )


    print(
        "\n" + "=" * 60
    )

    print(
        "Prediction completed."
    )

    print(
        "=" * 60
    )