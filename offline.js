export async function askOfflineWorker(type) {
  const worker = navigator.serviceWorker?.controller;
  if (!worker) throw new Error("Offline support is still starting.");
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => finish(new Error("Offline setup timed out.")), type === "prepare-arcade" ? 120000 : 3000);
    function finish(error, result) {
      clearTimeout(timer);
      channel.port1.close();
      if (error) reject(error); else resolve(result);
    }
    channel.port1.onmessage = ({ data }) => finish(data.error ? new Error(data.error) : null, data.ready);
    try { worker.postMessage({ type }, [channel.port2]); }
    catch (error) { finish(error); }
  });
}
