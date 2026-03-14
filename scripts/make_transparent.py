from PIL import Image
import os

def process_image(input_path, output_path):
    print(f"Processing {input_path}...")
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()

    newData = []
    for item in datas:
        # If the pixel is very light (white-ish), make it transparent
        # Using a threshold to catch off-white as well
        if item[0] > 200 and item[1] > 200 and item[2] > 200:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)

    img.putdata(newData)
    img.save(output_path, "PNG")
    print(f"Saved to {output_path}")

base_path = "/Users/natalia/.gemini/antigravity/brain/9833c015-13f6-48cb-8583-4f7ea45afec4"
target_path = "/Users/natalia/Desktop/MartaBot/public/avatars"

files = {
    "raw_fede_v12_bold_prep_1771114294208.png": "fede.png",
    "raw_rafa_v12_bold_prep_1771114310075.png": "rafa.png",
    "raw_guillermo_v12_bold_prep_1771114324123.png": "guillermo.png",
    "raw_gonza_v12_bold_prep_1771114339675.png": "gonza.png",
    "raw_hernan_v12_bold_prep_retry_1771114364530.png": "hernan.png",
    "raw_ana_v12_bold_prep_retry_1771114378968.png": "ana.png"
}

for raw_name, final_name in files.items():
    input_file = os.path.join(base_path, raw_name)
    output_file = os.path.join(target_path, final_name)
    process_image(input_file, output_file)
