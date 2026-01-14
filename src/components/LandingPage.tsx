export default function LandingPage() {
  const baseUrl = import.meta.env.BASE_URL;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <img
            src={`${baseUrl}capybot-logo.jpeg`}
            alt="CapyBot"
            className="w-10 h-10 rounded-full"
          />
          <h1 className="text-2xl font-bold text-gray-800">BehaviorNetViz</h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <p className="text-gray-600 mb-8 text-center">
            Choose an editor to get started:
          </p>

          <div className="space-y-4">
            <a
              href={`${baseUrl}?config=bn`}
              className="block bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-400 hover:shadow-md transition-all"
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                BehaviorNetViz (web)
              </h2>
              <p className="text-gray-600 mb-3">
                WebGUI for BehaviorNet config and runtime
              </p>
              <span className="text-sm text-blue-600 hover:underline">
                (source)
              </span>
            </a>

            <a
              href={`${baseUrl}?config=pn`}
              className="block bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-400 hover:shadow-md transition-all"
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Petri-Net Web Editor and Simulator
              </h2>
              <p className="text-gray-600">
                Skin version of BehaviorNetViz for editing and simulating Petri-Nets
              </p>
            </a>
          </div>
        </div>
      </main>

      <footer className="h-12 bg-gray-100 border-t border-gray-200 flex items-center justify-center px-4 text-sm text-gray-500">
        <span>
          &copy; {new Date().getFullYear()}{' '}
          <a
            href="https://capybot.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            CapyBot
          </a>
          {' · '}
          <a
            href="https://github.com/CapyRobot/BehaviorNetViz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Source Code
          </a>
        </span>
      </footer>
    </div>
  );
}
