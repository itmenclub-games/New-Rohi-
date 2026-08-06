#!/usr/bin/env python3

"""
armhack.py - A penetration testing learning toolkit for Kali Linux
inside Termux/PRoot on ARM64 phones.

Features:
- Interactive REPL loop with regex-based intent routing
- Safe subprocess execution (no shell=True, all commands as argument lists)
- Built-in and learnable skills for network reconnaissance
- Cross-platform installation hints (apt for PRot Kali, pkg for Termux)
- Comprehensive logging and command history

Usage: python3 armhack.py
"""

import os
import re
import subprocess
import json
import time
import signal
from pathlib import Path
from typing import List, Dict, Optional, Tuple

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
HOME_DIR = Path.home()
SKILLS_DIR = HOME_DIR / ".armhack"
SKILLS_FILE = SKILLS_DIR / "skills.json"
LOG_FILE = SKILLS_DIR / "log.txt"
TIMEOUT = 30  # seconds for subprocess calls

# Ensure the skills directory exists
SKILLS_DIR.mkdir(exist_ok=True)

# ---------------------------------------------------------------------------
# Logging utility
# ---------------------------------------------------------------------------
def log_command(user_input: str, command_used: str, result: str):
    """Append a timestamped entry to the log file."""
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    log_entry = (
        f"[{timestamp}] You: {user_input}\n"
        f"Command: {command_used}\n"
        f"Result: {result}\n"
        + "-" * 50 + "\n"
    )
    with open(LOG_FILE, "a") as f:
        f.write(log_entry)

# ---------------------------------------------------------------------------
# Persistent skill storage (learned skills survive restarts)
# ---------------------------------------------------------------------------
def load_skills() -> List[Dict]:
    """Load learned skills from ~/.armhack/skills.json."""
    if SKILLS_FILE.exists():
        try:
            with open(SKILLS_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return []
    return []

def save_skills(skills: List[Dict]):
    """Save learned skills to ~/.armhack/skills.json."""
    with open(SKILLS_FILE, "w") as f:
        json.dump(skills, f, indent=2)

# ---------------------------------------------------------------------------
# Tool existence check
# ---------------------------------------------------------------------------
def check_tool_exists(tool_name: str) -> bool:
    """Return True if the given binary is on PATH."""
    try:
        result = subprocess.run(
            ["which", tool_name],
            capture_output=True,
            text=True,
            timeout=5
        )
        return result.returncode == 0
    except Exception:
        return False

def print_install_hint(tool: str):
    """Print apt and pkg install hints for a missing tool."""
    print(f"\n[!] Tool '{tool}' not found on this system.")
    print("    Install it with one of the following commands:\n")
    print(f"    pkg update && pkg install {tool}")
    print(f"    apt update && apt install {tool}\n")

# ---------------------------------------------------------------------------
# Network info extraction from user text
# ---------------------------------------------------------------------------
def extract_network_info(text: str) -> Tuple[str, int]:
    """
    Extract an IP/hostname and optional port from user text.
    Defaults to host=127.0.0.1, port=80 when nothing is found.
    """
    # IPv4 address
    ip_pattern = r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
    # Port number preceded by a colon
    port_pattern = r':(\d{1,5})\b'
    # Hostname (letters, digits, dots, hyphens)
    hostname_pattern = r'\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b'

    ip_match = re.search(ip_pattern, text)
    port_match = re.search(port_pattern, text)
    hostname_match = re.search(hostname_pattern, text) if not ip_match else None

    host = ip_match.group() if ip_match else (hostname_match.group() if hostname_match else "127.0.0.1")
    port = int(port_match.group(1)) if port_match else 80

    return host, port

# ---------------------------------------------------------------------------
# Safe subprocess execution
# ---------------------------------------------------------------------------
def execute_command(cmd_parts: List[str]) -> str:
    """
    Run a command as an argument list (never shell=True).
    Returns stdout on success, or an error message on failure/timeout.
    """
    try:
        result = subprocess.run(
            cmd_parts,
            capture_output=True,
            text=True,
            timeout=TIMEOUT
        )
        if result.returncode == 0:
            return result.stdout
        else:
            stderr = result.stderr.strip() if result.stderr else "Unknown error"
            return f"Error (exit code {result.returncode}): {stderr}"
    except subprocess.TimeoutExpired:
        return f"Error: Command timed out after {TIMEOUT} seconds"
    except FileNotFoundError:
        return "Error: Command not found"
    except Exception as e:
        return f"Error: {str(e)}"

# ---------------------------------------------------------------------------
# Built-in skills
# ---------------------------------------------------------------------------
def get_builtin_skills() -> List[Dict]:
    """
    Return the list of built-in skills.
    Each skill has: name, regex (trigger pattern), and command (argument list).
    The TCP port scan skill uses a special handler for its two-phase approach.
    """
    return [
        {
            "name": "whois lookup",
            "regex": r"\bwhois\s+(\S+)",
            "command": ["whois", "{HOST}"]
        },
        {
            "name": "DNS enumeration",
            "regex": r"\bdig\s+(\S+)",
            "command": ["dig", "{HOST}", "ANY", "+answer"]
        },
        {
            "name": "traceroute",
            "regex": r"\btraceroute\s+(\S+)",
            "command": ["traceroute", "-m", "20", "{HOST}"]
        },
        {
            "name": "TCP port scan",
            "regex": r"\bportscan\s+(\S+)",
            "command": None,
            "handler": "portscan_handler"
        },
        {
            "name": "OS fingerprint",
            "regex": r"\bosfp\s+(\S+)",
            "command": ["sudo", "nmap", "-sS", "-O", "-Pn", "{HOST}"]
        },
        {
            "name": "UDP scan",
            "regex": r"\budpscan\s+(\S+)",
            "command": ["nmap", "-sU", "--top-ports", "50", "-Pn", "{HOST}"]
        },
        {
            "name": "HTTP headers",
            "regex": r"\bheaders\s+(https?://[^\s]+)",
            "command": ["curl", "-sI", "{HOST}"]
        },
        {
            "name": "directory brute force",
            "regex": r"\bdirb\s+(https?://[^\s]+)",
            "command": ["gobuster", "dir", "-u", "{HOST}", "-w", "rockyou.txt", "-t", "40", "-q"]
        },
        {
            "name": "web vuln scan",
            "regex": r"\bnikto\s+(https?://[^\s]+)",
            "command": ["nikto", "-h", "{HOST}"]
        },
        {
            "name": "SQLi scan",
            "regex": r"\bsqlmap\s+(https?://[^\s]+)",
            "command": ["sqlmap", "-u", "{HOST}", "--batch", "--risk=2", "--level=2"]
        },
        {
            "name": "SSH brute force",
            "regex": r"\bsshbrute\s+(\d{1,3}(?:\.\d{1,3}){3})/(\d+)",
            "command": ["hydra", "-L", "userlist.txt", "-P", "pass.txt", "ssh://{HOST}:{PORT}"]
        },
        {
            "name": "SMB enum",
            "regex": r"\bsmbenv\s+(\d{1,3}(?:\.\d{1,3}){3})/(\d+)",
            "command": ["enum4linux", "-a", "{HOST}"]
        }
    ]

# ---------------------------------------------------------------------------
# Special handler: two-phase TCP port scan
# ---------------------------------------------------------------------------
def portscan_handler(host: str) -> str:
    """
    Phase 1: nmap -sT -Pn --unprivileged --top-ports 1000 <host>
    Phase 2: For each open port found, run nmap -sV -p <port> <host>
    """
    # --- Phase 1 ---
    phase1_cmd = ["nmap", "-sT", "-Pn", "--unprivileged", "--top-ports", "1000", host]
    phase1_output = execute_command(phase1_cmd)

    # Parse open ports from phase 1 output
    open_ports = []
    for line in phase1_output.splitlines():
        if "/tcp" in line and "open" in line.lower():
            parts = line.split("/")
            if parts and parts[0].strip().isdigit():
                open_ports.append(parts[0].strip())

    if not open_ports:
        return f"No open ports found on {host} in phase 1 scan."

    # --- Phase 2 ---
    results = [f"=== Phase 1: Top-1000 TCP scan on {host} ===\n{phase1_output}\n"]
    results.append(f"=== Phase 2: Service detection on open ports {', '.join(open_ports)} ===\n")

    for port in open_ports:
        phase2_cmd = ["nmap", "-sV", "-p", port, host]
        phase2_output = execute_command(phase2_cmd)
        results.append(f"--- Port {port} ---\n{phase2_output}\n")

    return "".join(results)

# ---------------------------------------------------------------------------
# Help / menu
# ---------------------------------------------------------------------------
def show_help():
    """Print a formatted list of all available built-in skills."""
    print("\n" + "=" * 55)
    print("  armhack.py - Available Skills")
    print("=" * 55)

    for skill in get_builtin_skills():
        name = skill["name"]
        if "handler" in skill:
            # Skills with special handlers
            print(f"  {name}")
        else:
            cmd_str = " ".join(skill["command"]).replace("{HOST}", "<host>")
            print(f"  {name}: {cmd_str}")

    print("\n  learn  - Teach a new skill at runtime")
    print("  help   - Show this menu")
    print("  quit/exit/q - Exit armhack")
    print("=" * 55 + "\n")

# ---------------------------------------------------------------------------
# Main REPL loop
# ---------------------------------------------------------------------------
def main():
    print("\n" + "=" * 55)
    print("  armhack.py - Pentest Learning Toolkit")
    print("=" * 55)
    print("  Type 'help' or 'menu' for available skills.")
    print("  Type 'quit', 'exit', or 'q' to leave.")
    print("=" * 55 + "\n")

    # Load any previously learned skills
    learned_skills = load_skills()

    while True:
        try:
            # --- Prompt and read user input ---
            user_input = input("You: ").strip()

            # Skip empty lines
            if not user_input:
                continue

            # --- Exit commands ---
            if user_input.lower() in ("quit", "exit", "q"):
                print("\nGoodbye!\n")
                break

            # --- Help / menu ---
            if user_input.lower() in ("help", "menu"):
                show_help()
                log_command(user_input, "help", "displayed help menu")
                continue

            # --- Learn new skill ---
            # Format: learn "description" as: command {HOST} {PORT}
            learn_match = re.match(
                r'learn\s+"([^"]+)"\s+as:\s+(.+)',
                user_input,
                re.IGNORECASE
            )
            if learn_match:
                description = learn_match.group(1)
                skill_command = learn_match.group(2).strip()

                new_skill = {
                    "name": description,
                    "regex": re.escape(skill_command),
                    "command": skill_command
                }
                learned_skills.append(new_skill)
                save_skills(learned_skills)
                print(f"  [+] Learned new skill: \"{description}\"")
                log_command(user_input, "learn", f"skill \"{description}\" added")
                continue

            # --- Extract network info from user text ---
            extracted_host, extracted_port = extract_network_info(user_input)

            # --- Try to match a built-in or learned skill ---
            all_skills = get_builtin_skills() + learned_skills
            skill_matched = False

            for skill in all_skills:
                if re.search(skill["regex"], user_input, re.IGNORECASE):
                    skill_matched = True
                    skill_name = skill["name"]
                    cmd = skill.get("command")
                    handler = skill.get("handler")

                    # --- Skills with a special handler ---
                    if handler == "portscan_handler":
                        if not check_tool_exists("nmap"):
                            print_install_hint("nmap")
                            log_command(user_input, skill_name, "nmap not found")
                            break
                        result = portscan_handler(extracted_host)
                        print(result)
                        log_command(user_input, skill_name, result)
                        break

                    # --- Normal skills with a command list ---
                    if cmd:
                        # Check that the primary tool binary exists
                        tool_name = cmd[0]
                        if not check_tool_exists(tool_name):
                            print_install_hint(tool_name)
                            log_command(user_input, skill_name, f"tool '{tool_name}' not found")
                            break

                        # Substitute {HOST} and {PORT} placeholders
                        processed_cmd = [
                            arg.replace("{HOST}", extracted_host) for arg in cmd
                        ]
                        processed_cmd = [
                            arg.replace("{PORT}", str(extracted_port))
                            for arg in processed_cmd
                        ]

                        result = execute_command(processed_cmd)
                        print(result)
                        log_command(user_input, skill_name, result)
                        break

            # --- No skill matched ---
            if not skill_matched:
                print(f"  Unknown command: \"{user_input}\"")
                print("  Type 'help' for a list of available skills.\n")
                log_command(user_input, "unknown", "command not recognized")

        except KeyboardInterrupt:
            # Ctrl+C pressed — exit gracefully
            print("\n\nKeyboardInterrupt received. Exiting...\n")
            break
        except EOFError:
            # Ctrl+D pressed — exit gracefully
            print("\n\nEOF received. Exiting...\n")
            break
        except Exception as e:
            # Catch-all for any unexpected error
            print(f"\n  Unexpected error: {e}\n")
            log_command(user_input, "error", str(e))

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    main()

# Setup commands for first-time use:
#   pkg update && pkg install python
#   apt update && apt install nmap hydra sqlmap gobuster nikto curl whois dnsutils