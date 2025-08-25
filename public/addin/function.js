// BlocIQ Assistant Function Commands
// This file handles function commands for the Office Add-in

Office.onReady(() => {
  Office.actions.associate("openTaskpane", openTaskpane);
});

function openTaskpane(event) {
  Office.context.ui.displayDialogAsync(
    "taskpane.html",
    { height: 50, width: 50 },
    function (asyncResult) {
      console.log("Dialog opened", asyncResult);
    }
  );
  event.completed();
}

// Make the function available globally
window.openTaskpane = openTaskpane;
