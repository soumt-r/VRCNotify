import eel
import random
import time
import sys
import gevent
import json

import pyfiglet
import watchdog.observers
import watchdog.events
import os
import requests

# ------- CONSTANTS -------
VERSION = "3.0.1"
STATES = ["waiting for log", "notify ready", "paused notify", "error", "webhook setup", "sending webhook"]
COLORS = {
    "waiting for log": "rgba(0, 100, 255, 0.7)",
    "notify ready": "rgba(0, 255, 0, 0.7)",
    "paused notify": "rgba(255, 255, 0, 0.7)",
    "error": "rgba(255, 0, 0, 0.7)",
    "webhook setup": "rgba(128, 0, 128, 0.7)",
    "sending webhook": "rgba(0, 255, 255, 0.7)",
}

# ------- FOR PYINSTALLER -------
asset_path = getattr(sys, "_MEIPASS", ".")

if getattr(sys, "frozen", False):
        import pyi_splash

# ------- initialize eel -------
eel.init(asset_path + "/web")

# ------- UTILITY FUNCTIONS -------
def pretty_log(log_type, message, has_time=True):
    now_time = time.strftime("%H:%M:%S", time.localtime())

    colors = {
        "success": "[$2BAB4B$]",
        "error": "[$FF0000$]",
        "warning": "[$FFD700$]",
        "info": "[$00FFFF$]",
    }
    log_color = colors.get(log_type.split("_")[0], "[$FFFFFF$]")
    timestamp = f"[{now_time}] " if has_time else ""
    log_type = (
        f"[{log_color}{log_type.upper()}[$FFFFFF$]]"
        if not log_type.endswith("_hidden")
        else ""
    )
    eel.addLogMessage(
        f"[$FFFFFF$]{timestamp}{log_type} {log_color}{message}"
    )

def post_webhook_message(webhook_url, message):
    payload = {"content": message}

    state = VRCNotifyState()
    last_state = state.current_state
    state.update_state("sending webhook")

    try:
        response = requests.post(webhook_url, json=payload)
        state.update_state(last_state)
        return response.status_code == 204
    except requests.exceptions.RequestException:
        return False

def get_vrc_log_directory(error_handler):
    path = os.path.join(
        os.environ["USERPROFILE"], "AppData", "LocalLow", "VRChat", "VRChat"
    )
    if not os.path.exists(path):
        if error_handler:
            error_handler("Error", "VRC log directory not found")
        exit()
    return path


def get_new_lines(file_path, last_position):
    with open(file_path, "r", encoding="utf-8") as f:
        f.seek(last_position)
        new_lines = f.readlines()
        current_position = f.tell()
    return new_lines, current_position

@eel.expose
def handle_input(now_state, input_value):
    state = VRCNotifyState()

    pretty_log("info", f"Input received: {input_value}")
    if now_state.lower() == "webhook setup":
        # check if the webhook is valid
        payload = {"content": "VRCNotify test message."}
        
        try:
            r = requests.post(input_value, json=payload)

            if r.status_code == 204:
                pretty_log("success", "Discord webhook send success.")

            else:
                pretty_log("error", "Discord webhook send failed.")
                state.handle_error("Webhook setup", "Discord webhook send failed")
                return
        except requests.exceptions.RequestException as e:
            pretty_log("error", "Discord webhook send failed.")
            state.handle_error("Webhook setup", "Discord webhook send failed")
            return

        config = {"discord_webhook_url": input_value}
        with open("config.json", "w") as f:
            json.dump(config, f)
        pretty_log("success", "Config file written.")

        state.update_state("waiting for log")
        state.update_latest_activity("Config file written.")

# ------- STATE MANAGEMENT -------
class VRCNotifyState:
    # Singleton
    def __new__(cls):
        if not hasattr(cls, "instance"):
            cls.instance = super(VRCNotifyState, cls).__new__(cls)
        return cls.instance
    
    def __init__(self):
        if hasattr(self, "current_state"):
            return
        
        self.current_state = "waiting for log"
        self.config = {}
        self.log_dir = get_vrc_log_directory(self.handle_error)

    def start_blobs_thread(self):
        gevent.spawn(self.update_blobs)

    def handle_error(self, before_state, reason=""):
        pretty_log("error", f"An error occurred while {before_state}.", has_time=False)
        
        self.update_state("Error")
        if reason:
            self.update_latest_activity(reason)
        time.sleep(2)
        self.update_latest_activity("")
        self.update_state(before_state)

    def update_state(self, new_state):
        self.current_state = new_state.lower()

        is_input_required = False
        if self.current_state == "webhook setup":
            is_input_required = True

        eel.updateState(new_state, is_input_required)
        self.update_blobs_core()

    def update_blobs_core(self):
        new_positions = [
                {"x": random.uniform(0, 100), "y": random.uniform(0, 100)} for _ in range(3)
            ]
        eel.updateBlobs(new_positions, COLORS[self.current_state])

    def update_blobs(self):
        while True:
            self.update_blobs_core()
            gevent.sleep(2)

    def update_latest_activity(self, activity):
        eel.updateLatestActivity(activity)

    def load_config(self):
        try:
            with open("config.json", "r") as f:
                self.config = dict(json.load(f))
                pretty_log("success", "Settings loaded.")
        except FileNotFoundError:
            pretty_log("error", "Config file not found.")
            self.prompt_webhook_setup()

    def send_notify(self, message):
        discord_webhook_url = self.config["discord_webhook_url"]
        if not post_webhook_message(discord_webhook_url, message):
            pretty_log("error", "Failed to send Discord webhook.", has_time=False)
            self.handle_error("Notify ready", "Failed to send Discord webhook.")
        else:
            pretty_log("success", "Discord webhook sent successfully.", has_time=False)

    def prompt_webhook_setup(self):
        self.update_state("Webhook setup")
        self.update_latest_activity("Please enter your Discord Webhook URL.")

        while self.current_state in {"webhook setup", "error"}:
            gevent.sleep(1)

        # Load config again
        self.load_config()

        pretty_log("success", "Config file created.")

# ------- WATCHDOG HANDLER -------
class VRCLogEventHandler(watchdog.events.PatternMatchingEventHandler):
    def __init__(self, state, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.state = state
        self.last_position = 0
        self.user_name = None
        self.join_time = time.time()
        self.not_in_room = True
        self.is_first_analyze = True
        

    def on_modified(self, event):
        try:
            if event.is_directory or not event.src_path.endswith(".txt"):
                return
            lines, self.last_position = get_new_lines(event.src_path, self.last_position)
            
            for line in lines:
                self.process_log_line(line, self.is_first_analyze)
            self.is_first_analyze = False
        except Exception as e:
            pretty_log("error", f"Error occurred in watchdog: {e}")
            self.state.handle_error("Notify ready", "Error occurred in watchdog.")

    def process_log_line(self, line, is_first_analyze=False):
        if "User Authenticated" in line:
            self.user_name = self.extract_user_name(line)
            self.state.update_latest_activity(f"Welcome, {self.user_name}!")

        if "[Behaviour]" in line:
            self.process_behaviour_line(line, is_first_analyze)

    def process_player_line(self, line, mode):
        if mode == "join":
            nickname = line.split("OnPlayerJoined ")[1].replace("\n", "")
        else:
            nickname = line.split("OnPlayerLeft ")[1].replace("\n", "")
        
        # 만약 띄어쓰기를 기준으로 마지막이 '(usr_'으로 시작하면 뒤에 숫자가 붙어있는 것이므로 제거
        if nickname.split(" ")[-1].startswith("(usr_"):
            nickname = " ".join(nickname.split(" ")[:-1])
        
        emoji = "👤" if mode == "join" else "🚪"
        pretty_log("info", f"{emoji} Player {mode}: {nickname}")
        if self.not_in_room:
            pretty_log("warning", "Not sending message. Not in room.")
        elif time.time() - self.join_time < 10:
            pretty_log("warning", "Not sending message. Too short time after join.")
        elif nickname == self.user_name:
            pretty_log("warning", "Not sending message. local user.", has_time=False)
        else:
            self.state.send_notify(f"{emoji} Player {mode}: {nickname}")
            self.state.update_latest_activity(f"{emoji} Player {mode}: {nickname}")


    def extract_user_name(self, line):
        return line.split("User Authenticated: ")[1].split(" (")[0].strip()
    
    def process_behaviour_line(self, line, is_first=False):
        if "OnLeftRoom" in line:
            self.state.update_state("Paused notify")
            activity_message = "Paused notify while not in room."
            
            self.state.update_latest_activity(activity_message)
            if not is_first:
                pretty_log("warning", "Left Room. Ignore after users.")
            self.not_in_room = True
        elif "Joining or Creating Room" in line:
            room_name = line.split("Joining or Creating Room: ")[1].strip()
            self.state.update_state("Notify ready")
            activity_message = f"Joined to {room_name}"
            if not is_first:
                pretty_log("info", f"Joined to {room_name}, continuing notify.")
            self.state.update_latest_activity(activity_message)
            self.join_time = time.time()
            self.not_in_room = False
        elif is_first:
            pass
        elif "OnPlayerJoined " in line:
            self.process_player_line(line, mode="join")
        elif "OnPlayerLeft " in line:
            self.process_player_line(line, mode="leave")


# ------- MAIN LOGIC -------
def start_watchdog(state):
    event_handler = VRCLogEventHandler(state, patterns=["*.txt"])
    observer = watchdog.observers.Observer()
    observer.schedule(event_handler, state.log_dir, recursive=False)
    observer.start()
    return observer


def main():
    state = VRCNotifyState()

    #print(colorama.Fore.LIGHTCYAN_EX + pyfiglet.figlet_format("VRCNotify", font="slant"))
    eel.addLogMessage(pyfiglet.figlet_format("VRCNv3", font="slant"))
    pretty_log("info", f"VRCNotify v{VERSION} by @rerassi", has_time=False)
    pretty_log("info", "- Log Console", has_time=False)
    eel.addLogMessage("")

    # Initialize Eel
    eel.start("index.html", size=(400, 400), position=(0, 0), block=False)

    pretty_log("success", "Eel started.")
    state.start_blobs_thread()

    if getattr(sys, "frozen", False):
        pyi_splash.close()

    # Load configuration
    state.load_config()

    # Start watchdog
    observer = start_watchdog(state)
    pretty_log("success", "Watchdog started.")

    try:
        gevent.get_hub().join()
    except KeyboardInterrupt:
        pretty_log("warning", "Exiting VRCNotify.", has_time=False)
    finally:
        observer.stop()
        observer.join()


if __name__ == "__main__":
    
    main()
