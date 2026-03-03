import argparse
import sys


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", dest="files", action="append", default=[])
    parser.add_argument("--no-stdout", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    outputs = []

    try:
        for path in args.files:
            outputs.append(open(path, "a", encoding="utf-8", errors="replace"))

        for line in sys.stdin:
            if not args.no_stdout:
                sys.stdout.write(line)
                sys.stdout.flush()
            for file_obj in outputs:
                file_obj.write(line)
                file_obj.flush()
        return 0
    finally:
        for file_obj in outputs:
            try:
                file_obj.close()
            except Exception:
                pass


if __name__ == "__main__":
    raise SystemExit(main())
