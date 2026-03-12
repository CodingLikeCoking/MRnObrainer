const { TestRecorder } = require('./e2e/record.js');
const { spawn, execSync } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

const videoRecorder = new TestRecorder();
let tauriDriver;

// Helper function to find the local app executable across common build profiles/platforms.
const findExecutablePath = () => {
	const paths = [
		'./src-tauri/target/release/mrnobrainer-app.exe',
		'./src-tauri/target/x86_64-pc-windows-msvc/release/mrnobrainer-app.exe',
		'./src-tauri/target/release/mrnobrainer-app',
		'./src-tauri/target/x86_64-unknown-linux-gnu/release/mrnobrainer-app',
		'./src-tauri/target/release/screenpipe-app',
		'./src-tauri/target/release-dev/screenpipe-app',
		'./src-tauri/target/debug/screenpipe-app',
		'./src-tauri/target/release/MRnObrainer.app/Contents/MacOS/MRnObrainer',
		'./src-tauri/target/release-dev/MRnObrainer.app/Contents/MacOS/MRnObrainer',
		'./src-tauri/target/debug/MRnObrainer.app/Contents/MacOS/MRnObrainer'
	];

	for (const relPath of paths) {
		const absPath = path.resolve(relPath);
		if (fs.existsSync(absPath)) {
			return absPath;
		}
	}

	throw new Error(
		'Could not find a Tauri app executable. Build the app first (for example: cargo build --manifest-path src-tauri/Cargo.toml --profile release-dev).'
	);
};

const findTauriDriverPath = () => {
	const cargoBinPath = path.resolve(os.homedir(), '.cargo', 'bin', 'tauri-driver');
	if (fs.existsSync(cargoBinPath)) {
		return cargoBinPath;
	}
	try {
		return execSync('which tauri-driver', { encoding: 'utf8' }).trim();
	} catch {
		throw new Error(
			'tauri-driver not found. Install with `cargo install tauri-driver`.'
		);
	}
};

const assertTauriDriverSupported = (driverPath) => {
	try {
		execSync(`"${driverPath}" --help`, { stdio: 'pipe' });
	} catch (err) {
		const combined = `${err?.stdout || ''}\n${err?.stderr || ''}`.toLowerCase();
		if (combined.includes('not supported on this platform')) {
			throw new Error(
				`tauri-driver is not supported on this platform (${os.platform()} ${os.release()}). ` +
				'Run the onboarding/health checks on a supported host/CI image.'
			);
		}
	}
};

const executablePath = findExecutablePath();
exports.config = {
	hostname: '127.0.0.1',
	port: 4444,
	specs: ['./e2e/tests/**/*.js'],
	maxInstances: 1,
	capabilities: [
		{
			maxInstances: 1,
			'tauri:options': {
				application: executablePath
			}
		}
	],
	reporters: ['spec'],
	framework: 'mocha',
	mochaOpts: {
		ui: 'bdd',
		timeout: 60000
	},

	waitforTimeout: 10000,
	connectionRetryTimeout: 120000,
	connectionRetryCount: 0,

	before: async function() {
		// Initialize browser object
		// await browser.setWindowSize(1200, 850);
	},

	beforeTest: function (test) {
		const videoPath = path.join(__dirname, '/e2e/videos');
		videoRecorder.start(test, videoPath);
	},

	afterTest: async function () {
		await videoRecorder.stop();
	},

	// ensure we are running `tauri-driver` before the session starts so that we can proxy the webdriver requests
	beforeSession: () => {
		const driverPath = findTauriDriverPath();
		assertTauriDriverSupported(driverPath);
		tauriDriver = spawn(driverPath, [], {
			stdio: [null, process.stdout, process.stderr]
		});
	},

	afterSession: async () => {
		// Make sure to stop the video recorder before killing the tauri driver
		await videoRecorder.stop();
		
		if (tauriDriver) {
			tauriDriver.kill();
		}
	},
}; 
