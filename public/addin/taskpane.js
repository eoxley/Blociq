Office.onReady(() => {
  document.getElementById('analyseBtn').addEventListener('click', () => handleAction('analyse'));
  document.getElementById('summariseBtn').addEventListener('click', () => handleAction('summarise'));
  document.getElementById('draftBtn').addEventListener('click', () => handleAction('draft'));
});

function handleAction(action) {
  const output = document.getElementById('output');
  output.textContent = 'Working...';
  Office.context.mailbox.item.body.getAsync(Office.CoercionType.Text, async result => {
    if (result.status === Office.AsyncResultStatus.Succeeded) {
      try {
        const response = await fetch('/api/ask-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, body: result.value })
        });
        const data = await response.json();
        output.textContent = data.answer || JSON.stringify(data);
      } catch (err) {
        output.textContent = `Mock ${action} response: This is a simulated reply.`;
      }
    } else {
      output.textContent = 'Error retrieving email: ' + result.error.message;
    }
  });
}
