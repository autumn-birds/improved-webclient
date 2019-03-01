var Config = {
    // gateway: "ws://localhost:3000/",
    gateway: "wss://muck.spindizzy.org/wsgateway/",

    maxHistoryLines: 4015,

    sidebarBreakWidth: 800,      /* should match CSS (for now) */
    sidebarWidth:      20,       /* in %, should match CSS for now */
    sidebarWidthForSmallWindow: 50,   /* How wide should the sidebar be when the
         window is small (less wide than sidebarBreakWidth)?  When small, the sidebar
         is being floated on top of the muck I/O when visible, and there's a handy thing
         to click that toggles it on and off.  On a small screen, a larger % of the
         screen is needed to have a reasonable chance of looking okay.  Given that phone
         screens are very narrow you could even set this to 100%.  Though I suspect that
         on a phone you would probably just ignore the sidebar anyway, for the most
         part.  */

    greetingLines: [
                'USAGE: not much, currently; the keyboard shortcuts <control-n>, <control-p>,' +
                   ' and <control-l> allow you to move to the next or previous filter and set a custom' +
                   ' "command prefix" for the current filter, respectively (this last is mostly needed' +
                   ' when using puppets.)',

                'Press <control-o> or type /ts or /toggleSidebar to turn the sidebar to the left on' +
                   ' and off.',

                'COMMANDS: type /help for a list of other useful functions.'
    ],

    sendLineDelayMs: 10,   /* Should give about 10 lines/sec ... well, ok, 100 */

    chimeSoundFile: '169854__gnotesoundz__wind-chime-crunch.wav'
};
