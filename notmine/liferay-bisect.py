#!/usr/bin/env python
# Taken from https://grow.liferay.com/people/Liferay+Bisect+script

import os
import re
import subprocess
import sys
import builtins

# Debug printing is enabled by default.
quiet = False

dir_path = os.getcwd()

TMP_FILENAME = "tmp_bisect.txt"
LOG_FILENAME = "bisect_log.txt"

LPS_DICT = {}

def print_flush(*objects, sep='', end='\n', flush=False):
    return builtins.print(objects, sep, end, flush=True)

builtins.__print__ = print_flush

def print_help():
    print("SYNTAX : lb <bad_commit> <good_commit>")

def git_checkout(commit):
    print("Checking out " + commit)
    args = [commit]

    return run_process(True, "git", "checkout", args)

# git log --pretty=oneline fix-pack-de-28-7010..fix-pack-de-27-7010 > tmp_bisect.txt
def git_log_pretty(bad, good):
    args = ["--pretty=oneline", bad + "..." + good]

    output = run_process(True, "git", "log", args)
    file_write(TMP_FILENAME, output)

def run_process(output, program, cmd, *params):
    if not quiet:
        print("\t" + program + " " + cmd + " " +
              ' '.join(str(p) for p in params[0]))

    args = [program] + [cmd] + params[0]
    process = subprocess.Popen(args, stdout=subprocess.PIPE, cwd=dir_path)

    if output:
        return process.communicate()[0].decode("UTF-8", "replace")

# Write or Append
def file_write(filename, content, write=True):
    if not quiet:
        print("\t" + "Updating " + filename)

    with open(os.path.join(dir_path, filename),"w" if write else "a", encoding="UTF-8") as file:
        file.write(content)

def list_generate():
    """ Transform TMP_FILENAME into LOG_FILENAME """
    with open(TMP_FILENAME, encoding="UTF-8") as f:
        for line in f:
            split_line = line.split()

            commit_hash = split_line[0]
            LPS = split_line[1]

            if LPS != LPS.upper():
                continue
            elif LPS in LPS_DICT:
                continue
            else:
                LPS_DICT[LPS] = commit_hash

    output = "Most Recent\n\n"
    for lp in LPS_DICT:
        output += LPS_DICT[lp] + " : " + lp + "\n"

    output += "\nLeast Recent"

    file_write(LOG_FILENAME, output)

def list_log(commit_hash, cmd=""):
    """ Appends to LOG_FILENAME """
    if cmd:
        cmd = " - " + cmd

    content = cmd + "\n\n" + commit_hash
    file_write(LOG_FILENAME, content, False)

def main():
    # lb fix-pack-de-57-7010 fix-pack-de-58-7010
    num_args = len(sys.argv)

    if "-help" in sys.argv or "-h" in sys.argv:
        print_help()

    elif num_args == 2:
    	print_help()

    elif num_args == 3:
        bad = sys.argv[1]
        good = sys.argv[2]

        git_log_pretty(bad, good)

        list_generate()

        print("Generated " + LOG_FILENAME)

        # commit_hash = bisect()
        # git_checkout(commit_hash)

        # list_log(commit_hash)

    else:
        sys.exit("Improper argument.  '-help' for guide.")

if __name__ == "__main__":
    main()