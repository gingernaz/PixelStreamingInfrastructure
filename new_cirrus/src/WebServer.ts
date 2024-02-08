import express from 'express';
import path from 'path';
import fs from 'fs';
import { Logger } from './Logger';
import RateLimit from 'express-rate-limit';

interface IWebServerConfig {
	port?: number;
	root?: string;
	homepageFile: string;
	perMinuteRateLimit?: number;
}

export class WebServer {
	constructor(app: any, server: any, config: IWebServerConfig) {
		Logger.debug('Starting WebServer with config: %s', config);

		const httpPort = config.port || 80;
		const serveRoot = config.root || '.';
		const homepageFile = config.homepageFile || 'player.html';

		server.listen(httpPort, function () {
			Logger.info(`Http server listening on port ${httpPort}`);
		});

		app.use(express.static(path.join(serveRoot, '/Public')));
		app.use('/images', express.static(path.join(serveRoot, './images')));
		app.use('/scripts', express.static(path.join(serveRoot, '/scripts')));
		app.use('/', express.static(path.join(serveRoot, '/custom_html')));

		const pathsToTry = [
			path.join(serveRoot, homepageFile),
			path.join(serveRoot, '/Public', homepageFile),
			path.join(serveRoot, '/custom_html', homepageFile),
			homepageFile
		];

		// Request has been sent to site root, send the homepage file
		app.get('/', function (req: any, res: any) {
			// Try a few paths, see if any resolve to a homepage file the user has set
			for (let pathToTry of pathsToTry) {
				const p = path.resolve(pathToTry);
				if (fs.existsSync(p)) {
					// Send the file for browser to display it
					res.sendFile(p);
					return;
				}
			}

			// Catch file doesn't exist, and send back 404 if not
			const error = 'Unable to locate file ' + homepageFile;
			Logger.error(error);
			res.status(404).send(error);
			return;
		});

		if (config.perMinuteRateLimit) {
			var limiter = RateLimit({
			  windowMs: 60 * 1000, // 1 minute
			  max: config.perMinuteRateLimit
			});

			// apply rate limiter to all requests
			app.use(limiter);
		}
	}
}
