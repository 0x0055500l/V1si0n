import os
import re

src_dir = r"c:\Users\Alejandro\Downloads\IA\projject\V1si0n\frontend\src"
for root, dirs, files in os.walk(src_dir):
    for f in files:
        if f.endswith(('.js', '.jsx')):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            # Replace single quotes containing URL
            new_content = re.sub(r"'http://127\.0\.0\.1:8000([^']*)'", r"`http://${window.location.hostname}:8000\1`", content)
            # Replace double quotes containing URL
            new_content = re.sub(r'"http://127\.0\.0\.1:8000([^"]*)"', r"`http://${window.location.hostname}:8000\1`", new_content)
            # Replace backticks containing URL
            new_content = re.sub(r"`http://127\.0\.0\.1:8000([^`]*)`", r"`http://${window.location.hostname}:8000\1`", new_content)
            
            # Replace websocket URLs
            new_content = re.sub(r"'ws://localhost:8000([^']*)'", r"`ws://${window.location.hostname}:8000\1`", new_content)
            new_content = re.sub(r"`ws://localhost:8000([^`]*)`", r"`ws://${window.location.hostname}:8000\1`", new_content)

            if content != new_content:
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(new_content)
                print(f"Updated {f}")
