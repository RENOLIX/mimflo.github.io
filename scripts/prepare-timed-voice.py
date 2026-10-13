"""Reproduce the Piper model's additional alignment output (audio unchanged).

Install piper-tts[alignment]==1.8.0, then pass the original SIWIS ONNX and target.
Source and attribution are in public/speech/MODEL_CARD.txt and NOTICE.txt.
"""
import argparse
import onnx
from piper.patch_voice_with_alignment import add_alignment_output

parser = argparse.ArgumentParser()
parser.add_argument("source")
parser.add_argument("destination")
args = parser.parse_args()
model = onnx.load(args.source)
add_alignment_output(model)
onnx.checker.check_model(model)
onnx.save(model, args.destination)
