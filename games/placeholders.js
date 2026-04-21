export function renderPlaceholder(title, message) {
  return `
    <section class="panel">
      <div class="toolbar">
        <button class="secondary-button" type="button" data-menu>Back to Menu</button>
      </div>
      <h2>${title}</h2>
      <p class="intro">${message}</p>
      <div class="placeholder-art" aria-hidden="true">?</div>
      <p class="hint">This screen is already wired into the shared app shell.</p>
    </section>
  `;
}
