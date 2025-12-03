#!/bin/bash
#
# A script to resize images to a max width / height

# sudo apt install imagemagick
find public/img/blips -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \) -exec sh -c '
  for img; do
    width=$(identify -format "%w" "$img")
    height=$(identify -format "%h" "$img")
    if [ "$width" -gt 1000 ] || [ "$height" -gt 1000 ]; then
      mogrify -resize "1000x1000>" "$img"
      echo "Resized $img"
    else
      echo "Skipped $img"
    fi
  done
' sh {} +