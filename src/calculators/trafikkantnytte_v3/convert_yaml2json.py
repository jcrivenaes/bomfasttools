import json

import yaml


def convert_yaml_to_json(yaml_file_path, json_file_path):
    """
    Convert a YAML file to a JSON file.

    :param yaml_file_path: Path to the input YAML file.
    :param json_file_path: Path to the output JSON file.
    """
    with open(yaml_file_path, "r", encoding="utf-8") as yaml_file:
        yaml_data = yaml.safe_load(yaml_file)

    with open(json_file_path, "w", encoding="utf-8") as json_file:
        json.dump(yaml_data, json_file, ensure_ascii=False, indent=4)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Convert YAML to JSON.")
    parser.add_argument("yaml_file", help="Path to the input YAML file")
    parser.add_argument("json_file", help="Path to the output JSON file")

    args = parser.parse_args()

    convert_yaml_to_json(args.yaml_file, args.json_file)
    print(f"Converted {args.yaml_file} to {args.json_file}")
    print("Conversion complete.")
