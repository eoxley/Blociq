// BlocIQ Assistant Function Commands
// This file handles function commands for the Office Add-in

Office.onReady(() => {
  Office.actions.associate("openTaskpane", openTaskpane);
});

function openTaskpane(event) {
  Office.addin.showAsTaskpane().then(() => event.completed());
}
