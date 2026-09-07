import os

import torch
from PIL import Image
from torchvision import models, transforms


class MLPredictor:

    def __init__(self):

        # =================================================
        # PATHS
        # =================================================

        base_dir = os.path.dirname(
            os.path.abspath(__file__)
        )

        self.model_path = os.path.join(
            base_dir,
            "best_model.pth"
        )

        self.classes_path = os.path.join(
            base_dir,
            "classes.txt"
        )

        # =================================================
        # DEVICE
        # =================================================

        self.device = torch.device(
            "cuda"
            if torch.cuda.is_available()
            else "cpu"
        )

        print()
        print("========================================")
        print("Loading ML Predictor")
        print("========================================")
        print("Model:", self.model_path)
        print("Classes:", self.classes_path)
        print("Device:", self.device)

        # =================================================
        # CHECK MODEL
        # =================================================

        if not os.path.exists(
            self.model_path
        ):
            raise FileNotFoundError(
                f"Model not found: {self.model_path}"
            )

        if not os.path.exists(
            self.classes_path
        ):
            raise FileNotFoundError(
                f"Classes file not found: "
                f"{self.classes_path}"
            )

        # =================================================
        # LOAD CLASSES
        # =================================================

        with open(
            self.classes_path,
            "r",
            encoding="utf-8"
        ) as file:

            self.classes = [
                line.strip()
                for line in file.readlines()
                if line.strip()
            ]

        if not self.classes:

            raise ValueError(
                "classes.txt is empty."
            )

        print()
        print("Classes detected:")

        for index, class_name in enumerate(
            self.classes
        ):
            print(
                f"{index}: {class_name}"
            )

        # =================================================
        # LOAD CHECKPOINT
        # =================================================

        checkpoint = torch.load(
            self.model_path,
            map_location=self.device
        )

        # =================================================
        # CREATE EFFICIENTNET-B0
        # =================================================

        self.model = models.efficientnet_b0(
            weights=None
        )

        # Number of classes from dataset
        number_of_classes = len(
            self.classes
        )

        self.model.classifier[1] = (
            torch.nn.Linear(
                self.model.classifier[1].in_features,
                number_of_classes
            )
        )

        # =================================================
        # LOAD TRAINED WEIGHTS
        # =================================================

        if isinstance(
            checkpoint,
            dict
        ) and "model_state_dict" in checkpoint:

            self.model.load_state_dict(
                checkpoint["model_state_dict"]
            )

        else:

            self.model.load_state_dict(
                checkpoint
            )

        self.model.to(
            self.device
        )

        self.model.eval()

        # =================================================
        # IMAGE TRANSFORM
        # =================================================

        self.transform = transforms.Compose([

            transforms.Resize(
                (224, 224)
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

        print()
        print(
            "ML Predictor loaded successfully."
        )

        print(
            "Number of classes:",
            len(self.classes)
        )

        print(
            "========================================"
        )
        print()


    def predict(
        self,
        image_path,
        top_k=3
    ):

        # =================================================
        # VALIDATE IMAGE PATH
        # =================================================

        if not image_path:

            raise ValueError(
                "Image path is empty."
            )

        if not os.path.exists(
            image_path
        ):

            raise FileNotFoundError(
                f"Image not found: {image_path}"
            )

        # =================================================
        # OPEN IMAGE
        # =================================================

        try:

            image = Image.open(
                image_path
            ).convert("RGB")

        except Exception as error:

            raise ValueError(
                f"Unable to open image: {error}"
            )

        # =================================================
        # TRANSFORM IMAGE
        # =================================================

        image_tensor = self.transform(
            image
        )

        image_tensor = (
            image_tensor
            .unsqueeze(0)
            .to(self.device)
        )

        # =================================================
        # PREDICTION
        # =================================================

        with torch.no_grad():

            outputs = self.model(
                image_tensor
            )

            probabilities = torch.softmax(
                outputs,
                dim=1
            )

        # =================================================
        # TOP K
        # =================================================

        k = min(
            top_k,
            len(self.classes)
        )

        confidence_values, class_indices = (
            torch.topk(
                probabilities,
                k=k,
                dim=1
            )
        )

        confidence_values = (
            confidence_values[0]
            .cpu()
            .tolist()
        )

        class_indices = (
            class_indices[0]
            .cpu()
            .tolist()
        )

        # =================================================
        # BUILD RESULT
        # =================================================

        predictions = []

        for confidence, index in zip(
            confidence_values,
            class_indices
        ):

            predictions.append({

                "class":
                    self.classes[index],

                "confidence":
                    round(
                        float(confidence),
                        4
                    ),

                "confidence_percentage":
                    round(
                        float(confidence) * 100,
                        2
                    )
            })

        return predictions


# =========================================================
# GLOBAL PREDICTOR OBJECT
# =========================================================

predictor = MLPredictor()