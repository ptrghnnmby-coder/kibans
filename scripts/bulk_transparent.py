from PIL import Image
import os
import glob
import sys

def process_image(input_path, output_path):
    print(f"Processing {input_path}...")
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()

    newData = []
    for item in datas:
        # If the pixel is very light (white-ish), make it transparent
        # Threshold 200 is good for catching white/off-white backgrounds
        if item[0] > 200 and item[1] > 200 and item[2] > 200:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)

    img.putdata(newData)
    img.save(output_path, "PNG")
    print(f"Saved to {output_path}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 bulk_transparent.py <glob_pattern>")
        return

    pattern = sys.argv[1]
    files = glob.glob(pattern)

    if not files:
        print(f"No files found matching {pattern}")
        return

    for file_path in files:
        process_image(file_path, file_path)

if __name__ == "__main__":
    main()
