import json
import csv
import sys
import uuid


def convert_json_to_csv(input_json):
    # Process groups data
    groups_data = []
    voices_data = []

    # Create a mapping of group_name to group_id for reference
    group_id_map = {}

    for group in input_json["groups"]:
        # Generate UUID for group
        group_id = str(uuid.uuid4())
        group_id_map[group["group_name"]] = group_id

        # Add group to groups.csv data
        groups_data.append(
            {
                "id": group_id,
                "group_name": group["group_name"],
                "description_en": group["group_description"]["en"],
                "description_ja": group["group_description"]["ja"],
                "description_zh": group["group_description"]["zh"],
            }
        )

        # Process voices in this group
        for voice in group["voice_list"]:
            voices_data.append(
                {
                    "id": str(uuid.uuid4()),
                    "group_id": group_id,  # Reference to parent group
                    "group_name": group["group_name"],
                    "name": voice["name"],
                    "description_en": voice["description"]["en"],
                    "description_ja": voice["description"]["ja"],
                    "description_zh": voice["description"]["zh"],
                    "path": voice["path"],
                    "url": voice["url"],
                }
            )

    # Write groups.csv
    with open("groups.csv", "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f, delimiter="\t")
        # Write header
        writer.writerow(
            ["id", "group_name", "description_en", "description_ja", "description_zh"]
        )
        # Write data
        for group in groups_data:
            writer.writerow(
                [
                    group["id"],
                    group["group_name"],
                    group["description_en"],
                    group["description_ja"],
                    group["description_zh"],
                ]
            )

    # Write voices.csv
    with open("voices.csv", "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f, delimiter="\t")
        # Write header
        writer.writerow(
            [
                "id",
                "group_id",
                "group_name",
                "name",
                "description_en",
                "description_ja",
                "description_zh",
                "path",
                "url",
            ]
        )
        # Write data
        for voice in voices_data:
            writer.writerow(
                [
                    voice["id"],
                    voice["group_id"],
                    voice["group_name"],
                    voice["name"],
                    voice["description_en"],
                    voice["description_ja"],
                    voice["description_zh"],
                    voice["path"],
                    voice["url"],
                ]
            )


def main():
    # Check if JSON file is provided as argument
    if len(sys.argv) != 2:
        print("Usage: python script.py input.json")
        sys.exit(1)

    # Read JSON file
    try:
        with open(sys.argv[1], "r", encoding="utf-8") as f:
            data = json.load(f)
        convert_json_to_csv(data)
        print("Successfully created groups.csv and voices.csv")
    except FileNotFoundError:
        print(f"Error: File {sys.argv[1]} not found")
        sys.exit(1)
    except json.JSONDecodeError:
        print("Error: Invalid JSON file")
        sys.exit(1)


if __name__ == "__main__":
    main()
