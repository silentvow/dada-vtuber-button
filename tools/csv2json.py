import csv
import json
import sys


def read_csv_file(filename):
    """Read a CSV file and return its contents as a list of dictionaries"""
    data = []
    with open(filename, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        data = [row for row in reader]
    return data


def convert_csv_to_json(groups_file, voices_file):
    # Read both CSV files
    groups = read_csv_file(groups_file)
    voices = read_csv_file(voices_file)

    # Sort the list of dictionaries by the length of the 'description_zh' field
    voices = sorted(voices, key=lambda x: len(x["description_zh"]))

    # Create output JSON structure
    output = {"groups": []}

    # Group voices by group_id
    voices_by_group = {}
    for voice in voices:
        group_id = voice["group_id"]
        if group_id not in voices_by_group:
            voices_by_group[group_id] = []
        voices_by_group[group_id].append(voice)

    # Process each group
    for group in groups:
        group_data = {
            "group_name": group["group_name"],
            "group_description": {
                "en": group["description_en"],
                "ja": group["description_ja"],
                "zh": group["description_zh"],
            },
            "voice_list": [],
        }

        # Add all voices for this group
        if group["id"] in voices_by_group:
            for voice in voices_by_group[group["id"]]:
                voice_data = {
                    "name": voice["name"],
                    "description": {
                        "en": voice["description_en"],
                        "ja": voice["description_ja"],
                        "zh": voice["description_zh"],
                    },
                    "path": voice["path"],
                    "url": voice["url"],
                }
                if voice.get("TBD") == "*":
                    voice_data["TBD"] = True
                group_data["voice_list"].append(voice_data)

        output["groups"].append(group_data)

    return output


def main():
    # Check if CSV files are provided as arguments
    if len(sys.argv) != 4:
        print("Usage: python script.py groups.csv voices.csv output.json")
        sys.exit(1)

    groups_file = sys.argv[1]
    voices_file = sys.argv[2]
    output_file = sys.argv[3]

    try:
        # Convert CSV files to JSON
        output_data = convert_csv_to_json(groups_file, voices_file)

        # Write output JSON file with proper formatting and UTF-8 encoding
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)

        print(f"Successfully created {output_file}")

    except FileNotFoundError as e:
        print(f"Error: File not found - {e.filename}")
        sys.exit(1)
    except csv.Error as e:
        print(f"Error: Invalid CSV file - {str(e)}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: JSON encoding error - {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
