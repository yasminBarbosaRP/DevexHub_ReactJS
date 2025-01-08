#!/bin/bash

set -e

INPUT_FILE="app-config.local.yaml"
TEMP_FILE="temp_app_config.yaml"
MISSING_ENVS=()
INCLUDED_FILES=()

# Function to check if a file is in the included list
is_included() {
    local file="$1"
    for included in "${INCLUDED_FILES[@]}"; do
        if [[ "$included" == "$file" ]]; then
            return 0
        fi
    done
    return 1
}

# Function to add a file to the included list
add_included() {
    local file="$1"
    INCLUDED_FILES+=("$file")
}

# Function to process $include statements
process_includes() {
    local input="$1"
    local base_path="$2"

    if is_included "$input"; then
        # Already processed this file, prevent infinite recursion
        return
    fi
    add_included "$input"

    while IFS='' read -r line || [[ -n "$line" ]]; do
        # Trim leading whitespace
        trimmed_line="${line#"${line%%[![:space:]]*}"}"
        # Check for $include:
        if [[ "$trimmed_line" =~ ^\$include:[[:space:]]*(.*)$ ]]; then
            include_file="${BASH_REMATCH[1]}"
            # Trim whitespace from include_file
            include_file="$(echo "$include_file" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
            include_path="$base_path/$include_file"
            if [[ -f "$include_path" ]]; then
                # Recursively process the included file
                process_includes "$include_path" "$(dirname "$include_path")"
            else
                echo "Error: Included file not found: $include_path" >&2
                exit 1
            fi
        else
            echo "$line"
        fi
    done < "$input"
}

# Function to find all environment variables in the file
find_env_variables() {
    grep -o '\${[^}]*}' "$1" | sort | uniq | sed 's/[${}]//g'
}

# Function to check for missing environment variables
check_missing_envs() {
    local var
    for var in "$@"; do
        if [[ -z "${!var}" ]]; then
            MISSING_ENVS+=("$var")
        fi
    done
}

# Function to perform basic YAML validation (optional)
validate_yaml_basic() {
    local yaml_file="$1"

    # Implement validation here if needed
}

# Main processing
main() {
    if [[ ! -f "$INPUT_FILE" ]]; then
        echo "Error: Input file not found: $INPUT_FILE" >&2
        exit 1
    fi

    # Step 1: Process $include statements recursively and write to TEMP_FILE
    process_includes "$INPUT_FILE" "$(dirname "$(realpath "$INPUT_FILE")")" > "$TEMP_FILE"

    # Step 2: Find all environment variables
    ENV_VARS=($(find_env_variables "$TEMP_FILE"))

    # Step 3: Check for missing environment variables
    check_missing_envs "${ENV_VARS[@]}"

    if [[ ${#MISSING_ENVS[@]} -gt 0 ]]; then
        echo "Error: The following environment variables are missing, include in your .env file:"
        for var in "${MISSING_ENVS[@]}"; do
            echo " - $var"
        done
        rm -f "$TEMP_FILE"
        exit 1
    fi

    rm -f "$TEMP_FILE"
    echo "Your $INPUT_FILE config looks good."
}

main "$@"
