#!/bin/bash

# Common image extensions to target (case-insensitive)
exts=(jpg jpeg png gif tif tiff webp heic heif bmp)
args=()
for e in "${exts[@]}"; do
  args+=(-ext "$e")
done
# Strip *all* metadata, keep image data intact, recurse from repo root
exiftool -overwrite_original -all= -r "${args[@]}" .