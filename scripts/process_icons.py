import os
from PIL import Image

def process_image(file_path):
    try:
        img = Image.open(file_path).convert("RGBA")
        datas = img.getdata()

        new_data = []
        for item in datas:
            # Change all white (also shades of whites)
            # to transparent
            if item[0] > 200 and item[1] > 200 and item[2] > 200:
                new_data.append((255, 255, 255, 0))
            else:
                # Change black/dark pixels to Gray (e.g., #CCCCCC = 204, 204, 204)
                # Maintaining alpha if it exists, though source is likely opaque
                # Let's assume non-white is the line.
                # Making it Light Gray for Dark Mode visibility
                new_data.append((200, 200, 200, 255))

        img.putdata(new_data)
        img.save(file_path, "PNG")
        print(f"Processed: {file_path}")
    except Exception as e:
        print(f"Failed to process {file_path}: {e}")

def main():
    directory = 'public/icons/species'
    if not os.path.exists(directory):
        print(f"Directory not found: {directory}")
        return

    for filename in os.listdir(directory):
        if filename.endswith(".png"):
            file_path = os.path.join(directory, filename)
            process_image(file_path)

if __name__ == "__main__":
    main()
