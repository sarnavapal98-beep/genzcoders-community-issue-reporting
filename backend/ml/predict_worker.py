import contextlib
import json
import os
import sys


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: predict_worker.py IMAGE_PATH")

    os.environ.setdefault("OMP_NUM_THREADS", "1")
    os.environ.setdefault("MKL_NUM_THREADS", "1")
    os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")

    import torch
    torch.set_num_threads(1)
    try:
        torch.set_num_interop_threads(1)
    except RuntimeError:
        pass

    with contextlib.redirect_stdout(sys.stderr):
        from predictor import predictor
        predictions = predictor.predict(sys.argv[1], top_k=3)

    print(json.dumps({"predictions": predictions}))


if __name__ == "__main__":
    main()
