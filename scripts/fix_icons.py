import os
from PIL import Image

def remove_background(image_path):
    print(f"Processing {image_path}...")
    img = Image.open(image_path)
    img = img.convert("RGBA")
    
    datas = img.getdata()
    
    new_data = []
    # Threshold for "white"
    threshold = 240
    
    for item in datas:
        # If the pixel is white-ish, make it transparent
        if item[0] > threshold and item[1] > threshold and item[2] > threshold:
            new_data.append((255, 255, 255, 0))
        else:
            # Keep original, but ensure it's black for the filter to work best
            # or just keep original. The icons are black lines.
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(image_path, "PNG")
    print(f"Finished {image_path}")

icons_dir = "/Users/natalia/Desktop/MartaBot/public/icons/species/"
for filename in os.listdir(icons_dir):
    if filename.endswith("_v2.png"):
        remove_background(os.path.join(icons_dir, filename))
