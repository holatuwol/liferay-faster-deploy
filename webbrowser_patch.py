import sys
import webbrowser

class Opera(webbrowser.UnixBrowser):
	"Launcher class for Opera browser."

	remote_args = ['%action', '%s']
	remote_action = ""
	remote_action_newwin = "--new-window"
	remote_action_newtab = ""
	background = True

webbrowser.register('opera', None, Opera('opera'))

if __name__ == '__main__':
	webbrowser.open(sys.argv[1])