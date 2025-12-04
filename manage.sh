#!/bin/bash

# Global Variables
BACKUP_DIR="./backups"
SECRETS_DIR="./secrets"
ENV_FILE=".env"
ENV_TEMPLATE=".env.example"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "${YELLOW}This script requires root privileges.${NC}"
  echo "Please run as root or use sudo."
  exit 1
fi

# Function to check and install dependencies
check_dependencies() {
    if ! command -v whiptail &> /dev/null; then
        echo -e "${YELLOW}whiptail is not installed. Installing...${NC}"
        if [ -x "$(command -v apt-get)" ]; then
            apt-get update && apt-get install -y whiptail
        elif [ -x "$(command -v yum)" ]; then
            yum install -y newt
        elif [ -x "$(command -v dnf)" ]; then
            dnf install -y newt
        elif [ -x "$(command -v apk)" ]; then
            apk add newt
        else
            echo -e "${RED}Could not detect package manager. Please install whiptail manually.${NC}"
            exit 1
        fi
    fi
}

check_dependencies

# Main Menu
while true; do
    # Get Running Containers
    # Using docker compose ps to get status. 
    # We might need to handle if docker compose is not running or no containers.
    CONTAINERS=$(docker compose ps --format "table {{.Service}}\t{{.State}}\t{{.Status}}" 2>/dev/null | tail -n +2)
    if [ -z "$CONTAINERS" ]; then
        CONTAINERS="No containers running or docker compose stack not active."
    fi
    
    CURRENT_TIME=$(date "+%Y-%m-%d %H:%M:%S")
    
    MENU_TEXT="Docker Management Script\nCurrent Time: $CURRENT_TIME\n\nContainers:\n$CONTAINERS"

    # Whiptail menu
    # The height/width might need adjustment based on content
    CHOICE=$(whiptail --title "Main Menu" --menu "$MENU_TEXT" 25 100 15 \
        "1" "Runtime" \
        "2" "Logs" \
        "3" "Volumes" \
        "4" "Setup Variables" \
        "5" "Exit" 3>&1 1>&2 2>&3)

    EXIT_STATUS=$?
    if [ $EXIT_STATUS -ne 0 ]; then
        break
    fi

    case $CHOICE in
        1)
            while true; do
                RUNTIME_CHOICE=$(whiptail --title "Runtime Management" --menu "Select Action" 15 60 4 \
                    "1" "Status" \
                    "2" "Start Services" \
                    "3" "Stop Services" \
                    "4" "Restart Services" \
                    "5" "Back" 3>&1 1>&2 2>&3)
                
                if [ $? -ne 0 ]; then break; fi

                case $RUNTIME_CHOICE in
                    1)
                        # Status
                        STATUS=$(docker compose ps --format "table {{.Service}}\t{{.State}}\t{{.Status}}")
                        whiptail --title "Container Status" --msgbox "$STATUS" 20 100
                        ;;
                    2|3|4)
                        # Start/Stop/Restart
                        ACTION=""
                        case $RUNTIME_CHOICE in
                            2) ACTION="start";;
                            3) ACTION="stop";;
                            4) ACTION="restart";;
                        esac

                        # Get services
                        SERVICES=$(docker compose config --services)
                        if [ -z "$SERVICES" ]; then
                            whiptail --msgbox "No services found in docker-compose.yml" 10 60
                            continue
                        fi

                        # Build checklist
                        CHECKLIST_ARGS=()
                        while read -r service; do
                            CHECKLIST_ARGS+=("$service" "" "OFF")
                        done <<< "$SERVICES"

                        SELECTED_SERVICES=$(whiptail --title "$ACTION Services" --checklist "Select services to $ACTION" 20 60 10 "${CHECKLIST_ARGS[@]}" 3>&1 1>&2 2>&3)
                        
                        if [ $? -eq 0 ]; then
                            # Remove quotes from selection
                            SELECTED_SERVICES=$(echo "$SELECTED_SERVICES" | tr -d '"')
                            
                            if [ -z "$SELECTED_SERVICES" ]; then
                                whiptail --msgbox "No services selected." 10 60
                            else
                                # Execute command
                                whiptail --infobox "Performing $ACTION on: $SELECTED_SERVICES..." 10 60
                                docker compose $ACTION $SELECTED_SERVICES
                                whiptail --msgbox "$ACTION completed." 10 60
                            fi
                        fi
                        ;;
                    5)
                        break
                        ;;
                esac
            done
            ;;
        2)
            while true; do
                # Get services for logs
                SERVICES=$(docker compose config --services)
                if [ -z "$SERVICES" ]; then
                    whiptail --msgbox "No services found." 10 60
                    break
                fi

                RADIOLIST_ARGS=()
                while read -r service; do
                    RADIOLIST_ARGS+=("$service" "" "OFF")
                done <<< "$SERVICES"

                SELECTED_SERVICE=$(whiptail --title "Logs Management" --radiolist "Select Service" 20 60 10 "${RADIOLIST_ARGS[@]}" 3>&1 1>&2 2>&3)
                
                if [ $? -ne 0 ]; then break; fi
                
                # Remove quotes
                SELECTED_SERVICE=$(echo "$SELECTED_SERVICE" | tr -d '"')

                if [ -z "$SELECTED_SERVICE" ]; then
                    whiptail --msgbox "No service selected." 10 60
                    continue
                fi

                LOG_ACTION=$(whiptail --title "Log Options for $SELECTED_SERVICE" --menu "Select Option" 15 60 3 \
                    "1" "Live Logs" \
                    "2" "View Last 100 Lines" \
                    "3" "Download Logs" 3>&1 1>&2 2>&3)

                if [ $? -ne 0 ]; then continue; fi

                case $LOG_ACTION in
                    1)
                        clear
                        echo "Showing live logs for $SELECTED_SERVICE. Press Ctrl+C to exit."
                        docker compose logs -f "$SELECTED_SERVICE"
                        read -p "Press Enter to return to menu..."
                        ;;
                    2)
                        # We use a temp file to view logs in whiptail or just clear and use less
                        # Using less is better for navigation
                        clear
                        docker compose logs --tail 100 "$SELECTED_SERVICE" | less
                        ;;
                    3)
                        if [ ! -d "$BACKUP_DIR" ]; then mkdir -p "$BACKUP_DIR"; fi
                        TIMESTAMP=$(date "+%Y%m%d_%H%M%S")
                        LOG_FILE="$BACKUP_DIR/${SELECTED_SERVICE}_${TIMESTAMP}.log"
                        docker compose logs "$SELECTED_SERVICE" > "$LOG_FILE"
                        whiptail --msgbox "Logs saved to $LOG_FILE" 10 60
                        ;;
                esac
            done
            ;;
        3)
            while true; do
                VOL_ACTION=$(whiptail --title "Volume Management" --menu "Select Action" 15 60 4 \
                    "1" "Backup" \
                    "2" "Recover" \
                    "3" "Recent Backups" \
                    "4" "Back" 3>&1 1>&2 2>&3)
                
                if [ $? -ne 0 ]; then break; fi

                case $VOL_ACTION in
                    1)
                        # Backup
                        BACKUP_TYPE=$(whiptail --title "Backup" --menu "Select Backup Type" 15 60 3 \
                            "1" "One Volume" \
                            "2" "All Volumes" \
                            "3" "Back" 3>&1 1>&2 2>&3)
                        
                        if [ $? -ne 0 ]; then continue; fi

                        if [ ! -d "$BACKUP_DIR" ]; then mkdir -p "$BACKUP_DIR"; fi
                        TIMESTAMP=$(date "+%Y%m%d_%H%M%S")

                        case $BACKUP_TYPE in
                            1)
                                # One Volume
                                VOLUMES=$(docker compose config --volumes)
                                if [ -z "$VOLUMES" ]; then
                                    whiptail --msgbox "No volumes found." 10 60
                                    continue
                                fi

                                RADIOLIST_ARGS=()
                                while read -r vol; do
                                    RADIOLIST_ARGS+=("$vol" "" "OFF")
                                done <<< "$VOLUMES"

                                SELECTED_VOL=$(whiptail --title "Backup Volume" --radiolist "Select Volume" 20 60 10 "${RADIOLIST_ARGS[@]}" 3>&1 1>&2 2>&3)
                                
                                if [ $? -eq 0 ]; then
                                    SELECTED_VOL=$(echo "$SELECTED_VOL" | tr -d '"')
                                    if [ -n "$SELECTED_VOL" ]; then
                                        # Get actual volume name (prepend project name if needed, but compose config returns logical name)
                                        # We need the actual volume name on host.
                                        # docker compose config --volumes returns the key in compose file.
                                        # The actual volume name is usually project_volume.
                                        # Let's inspect to get the name.
                                        PROJECT_NAME=$(docker compose config --format json | grep -o '"name": "[^"]*"' | cut -d'"' -f4)
                                        if [ -z "$PROJECT_NAME" ]; then PROJECT_NAME=${PWD##*/}; fi
                                        # Fallback to simple concatenation if inspect fails or complex logic needed
                                        # Better: use docker volume ls --filter label=com.docker.compose.project=$PROJECT_NAME
                                        
                                        # Actually, let's just use the volume name from compose and let docker run handle it if mapped?
                                        # No, we need to mount the volume.
                                        # If we use `docker run -v project_volume:/data ...` it works.
                                        # But we only have the logical name `db_data`.
                                        # The actual volume is `nat_db_data` (usually).
                                        
                                        # Let's try to find the actual volume name.
                                        ACTUAL_VOL_NAME=$(docker volume ls --format "{{.Name}}" | grep "${PROJECT_NAME}_${SELECTED_VOL}$" | head -n 1)
                                        if [ -z "$ACTUAL_VOL_NAME" ]; then
                                            # Try exact match if external
                                            ACTUAL_VOL_NAME=$SELECTED_VOL
                                        fi

                                        whiptail --infobox "Backing up $ACTUAL_VOL_NAME..." 10 60
                                        docker run --rm -v "$ACTUAL_VOL_NAME":/data -v "$PWD/$BACKUP_DIR":/backup alpine tar cvf "/backup/${SELECTED_VOL}_${TIMESTAMP}.tar" -C /data .
                                        whiptail --msgbox "Backup created: ${SELECTED_VOL}_${TIMESTAMP}.tar" 10 60
                                    fi
                                fi
                                ;;
                            2)
                                # All Volumes
                                VOLUMES=$(docker compose config --volumes)
                                if [ -z "$VOLUMES" ]; then
                                    whiptail --msgbox "No volumes found." 10 60
                                    continue
                                fi
                                
                                PROJECT_NAME=$(docker compose config --format json | grep -o '"name": "[^"]*"' | cut -d'"' -f4)
                                if [ -z "$PROJECT_NAME" ]; then PROJECT_NAME=${PWD##*/}; fi

                                whiptail --infobox "Backing up all volumes..." 10 60
                                while read -r vol; do
                                    ACTUAL_VOL_NAME=$(docker volume ls --format "{{.Name}}" | grep "${PROJECT_NAME}_${vol}$" | head -n 1)
                                    if [ -z "$ACTUAL_VOL_NAME" ]; then ACTUAL_VOL_NAME=$vol; fi
                                    
                                    docker run --rm -v "$ACTUAL_VOL_NAME":/data -v "$PWD/$BACKUP_DIR":/backup alpine tar cvf "/backup/${vol}_${TIMESTAMP}.tar" -C /data .
                                done <<< "$VOLUMES"
                                whiptail --msgbox "All volumes backed up." 10 60
                                ;;
                        esac
                        ;;
                    2)
                        # Recover
                        RECOVER_TYPE=$(whiptail --title "Recover" --menu "Select Recover Type" 15 60 3 \
                            "1" "One Volume" \
                            "2" "All Volumes (Not implemented)" \
                            "3" "Back" 3>&1 1>&2 2>&3)
                            
                        if [ $? -ne 0 ]; then continue; fi
                        
                        case $RECOVER_TYPE in
                            1)
                                # List backups
                                BACKUPS=$(ls "$BACKUP_DIR"/*.tar 2>/dev/null)
                                if [ -z "$BACKUPS" ]; then
                                    whiptail --msgbox "No backups found." 10 60
                                    continue
                                fi
                                
                                RADIOLIST_ARGS=()
                                for backup in $BACKUPS; do
                                    RADIOLIST_ARGS+=("$(basename "$backup")" "" "OFF")
                                done
                                
                                SELECTED_BACKUP=$(whiptail --title "Select Backup" --radiolist "Select backup file" 20 60 10 "${RADIOLIST_ARGS[@]}" 3>&1 1>&2 2>&3)
                                
                                if [ $? -eq 0 ]; then
                                    SELECTED_BACKUP=$(echo "$SELECTED_BACKUP" | tr -d '"')
                                    if [ -n "$SELECTED_BACKUP" ]; then
                                        # Ask for target volume
                                        VOLUMES=$(docker compose config --volumes)
                                        RADIOLIST_ARGS=()
                                        while read -r vol; do
                                            RADIOLIST_ARGS+=("$vol" "" "OFF")
                                        done <<< "$VOLUMES"
                                        
                                        TARGET_VOL=$(whiptail --title "Target Volume" --radiolist "Select target volume for $(basename "$SELECTED_BACKUP")" 20 60 10 "${RADIOLIST_ARGS[@]}" 3>&1 1>&2 2>&3)
                                        
                                        if [ $? -eq 0 ]; then
                                            TARGET_VOL=$(echo "$TARGET_VOL" | tr -d '"')
                                            if [ -n "$TARGET_VOL" ]; then
                                                PROJECT_NAME=$(docker compose config --format json | grep -o '"name": "[^"]*"' | cut -d'"' -f4)
                                                if [ -z "$PROJECT_NAME" ]; then PROJECT_NAME=${PWD##*/}; fi
                                                ACTUAL_VOL_NAME=$(docker volume ls --format "{{.Name}}" | grep "${PROJECT_NAME}_${TARGET_VOL}$" | head -n 1)
                                                if [ -z "$ACTUAL_VOL_NAME" ]; then ACTUAL_VOL_NAME=$TARGET_VOL; fi

                                                whiptail --infobox "Restoring $SELECTED_BACKUP to $ACTUAL_VOL_NAME..." 10 60
                                                # Create volume if not exists? No, assume it exists or let docker create it.
                                                # But we should probably clear it first?
                                                # For safety, let's just untar over it.
                                                docker run --rm -v "$ACTUAL_VOL_NAME":/data -v "$PWD/$BACKUP_DIR":/backup alpine sh -c "tar xvf /backup/$SELECTED_BACKUP -C /data"
                                                whiptail --msgbox "Recovery completed." 10 60
                                            fi
                                        fi
                                    fi
                                fi
                                ;;
                            2)
                                whiptail --msgbox "Recover All Volumes - Not implemented yet (requires strict naming convention)" 10 60
                                ;;
                        esac
                        ;;
                    3)
                        # Recent Backups
                        if [ -d "$BACKUP_DIR" ]; then
                            BACKUPS=$(ls -lh "$BACKUP_DIR" | tail -n +2)
                            whiptail --title "Recent Backups" --msgbox "$BACKUPS" 20 80
                        else
                            whiptail --msgbox "No backups directory found." 10 60
                        fi
                        ;;
                    4)
                        break
                        ;;
                esac
            done
            ;;
        4)
            while true; do
                SETUP_ACTION=$(whiptail --title "Variable Setup" --menu "Select Action" 15 60 3 \
                    "1" "Secrets" \
                    "2" ".env" \
                    "3" "Back" 3>&1 1>&2 2>&3)
                
                if [ $? -ne 0 ]; then break; fi

                case $SETUP_ACTION in
                    1)
                        # Secrets
                        if [ ! -d "$SECRETS_DIR" ]; then
                            whiptail --msgbox "Secrets directory not found." 10 60
                            continue
                        fi

                        # Check for files starting with _
                        UNDERSCORE_FILES=$(find "$SECRETS_DIR" -maxdepth 1 -name "_*" -type f)
                        
                        if [ -n "$UNDERSCORE_FILES" ]; then
                            whiptail --msgbox "Found uninitialized secrets (starting with _). Starting setup..." 10 60
                            for file in $UNDERSCORE_FILES; do
                                BASENAME=$(basename "$file")
                                NEW_NAME="${BASENAME#_}"
                                NEW_PATH="$SECRETS_DIR/$NEW_NAME"
                                
                                # Prompt for value
                                VALUE=$(whiptail --title "Setup Secret: $NEW_NAME" --inputbox "Enter value for $NEW_NAME" 10 60 3>&1 1>&2 2>&3)
                                
                                if [ $? -eq 0 ]; then
                                    echo "$VALUE" > "$NEW_PATH"
                                    rm "$file"
                                    whiptail --msgbox "Secret $NEW_NAME updated." 10 60
                                else
                                    whiptail --msgbox "Skipped $NEW_NAME." 10 60
                                fi
                            done
                        else
                            # Edit existing secrets
                            SECRETS=$(find "$SECRETS_DIR" -maxdepth 1 -type f)
                            if [ -z "$SECRETS" ]; then
                                whiptail --msgbox "No secrets found." 10 60
                                continue
                            fi

                            for file in $SECRETS; do
                                BASENAME=$(basename "$file")
                                CURRENT_VALUE=$(cat "$file")
                                
                                VALUE=$(whiptail --title "Edit Secret: $BASENAME" --inputbox "Enter value for $BASENAME" 10 60 "$CURRENT_VALUE" 3>&1 1>&2 2>&3)
                                
                                if [ $? -eq 0 ]; then
                                    echo "$VALUE" > "$file"
                                    whiptail --msgbox "Secret $BASENAME updated." 10 60
                                fi
                            done
                        fi
                        ;;
                    2)
                        # .env
                        if [ ! -f "$ENV_FILE" ]; then
                            if [ -f "$ENV_TEMPLATE" ]; then
                                whiptail --yesno ".env file not found. Create from template?" 10 60
                                if [ $? -eq 0 ]; then
                                    cp "$ENV_TEMPLATE" "$ENV_FILE"
                                    whiptail --msgbox ".env created from template." 10 60
                                else
                                    continue
                                fi
                            else
                                whiptail --msgbox ".env and .env.template not found." 10 60
                                continue
                            fi
                        fi

                        # Loop through variables
                        # This is a simple parser, might not handle complex env files perfectly
                        # We create a temp file to store updates
                        TEMP_ENV=$(mktemp)
                        
                        while IFS= read -r line || [ -n "$line" ]; do
                            # Skip comments and empty lines
                            if [[ "$line" =~ ^#.* ]] || [[ -z "$line" ]]; then
                                echo "$line" >> "$TEMP_ENV"
                                continue
                            fi

                            # Parse KEY=VALUE
                            if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
                                KEY="${BASH_REMATCH[1]}"
                                VALUE="${BASH_REMATCH[2]}"
                                
                                NEW_VALUE=$(whiptail --title "Edit .env" --inputbox "Enter value for $KEY" 10 60 "$VALUE" 3>&1 1>&2 2>&3)
                                
                                if [ $? -eq 0 ]; then
                                    echo "$KEY=$NEW_VALUE" >> "$TEMP_ENV"
                                else
                                    echo "$line" >> "$TEMP_ENV"
                                fi
                            else
                                echo "$line" >> "$TEMP_ENV"
                            fi
                        done < "$ENV_FILE"
                        
                        mv "$TEMP_ENV" "$ENV_FILE"
                        whiptail --msgbox ".env updated." 10 60
                        ;;
                    3)
                        break
                        ;;
                esac
            done
            ;;
        5)
            break
            ;;
    esac
done

clear
