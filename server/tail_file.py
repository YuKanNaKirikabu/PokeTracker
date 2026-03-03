import os
import sys
import time


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: tail_file.py <file_path>")
        return 1

    file_path = sys.argv[1]

    while not os.path.exists(file_path):
        time.sleep(0.1)

    with open(file_path, "r", encoding="utf-8", errors="replace") as file_obj:
        while True:
            line = file_obj.readline()
            if line:
                sys.stdout.write(line)
                sys.stdout.flush()
            else:
                time.sleep(0.1)


if __name__ == "__main__":
    raise SystemExit(main())
