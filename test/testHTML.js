/*
 * Copyright 2018 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
/* eslint-env mocha */
const assert = require('assert');
const { Logger } = require('@adobe/helix-shared');
const fs = require('fs-extra');
const path = require('path');
const NodeHttpAdapter = require('@pollyjs/adapter-node-http');
const FSPersister = require('@pollyjs/persister-fs');
const setupPolly = require('@pollyjs/core').setupMocha;
const { pipe } = require('../src/defaults/html.pipe.js');
const dump = require('../src/utils/dump-context.js');

const logger = Logger.getTestLogger({
  // tune this for debugging
  level: 'info',
});

const params = {
  path: '/hello.md',
  __ow_method: 'get',
  owner: 'trieloff',
  __ow_headers: {
    'X-Forwarded-Port': '443',
    'X-CDN-Request-Id': '2a208a89-e071-44cf-aee9-220880da4c1e',
    'Fastly-Client': '1',
    'X-Forwarded-Host': 'runtime.adobe.io',
    'Upgrade-Insecure-Requests': '1',
    Host: 'controller-a',
    Connection: 'close',
    'Fastly-SSL': '1',
    'X-Request-Id': 'RUss5tPdgOfw74a68aNc24FeTipGpVfW',
    'X-Branch': 'master',
    'Accept-Language': 'en-US, en;q=0.9, de;q=0.8',
    'X-Forwarded-Proto': 'https',
    'Fastly-Orig-Accept-Encoding': 'gzip',
    'X-Varnish': '267021320',
    DNT: '1',
    'X-Forwarded-For':
      '192.147.117.11, 157.52.92.27, 23.235.46.33, 10.64.221.107',
    'X-Host': 'www.primordialsoup.life',
    Accept:
      'text/html, application/xhtml+xml, application/xml;q=0.9, image/webp, image/apng, */*;q=0.8',
    'X-Real-IP': '10.64.221.107',
    'X-Forwarded-Server': 'cache-lcy19249-LCY, cache-iad2127-IAD',
    'Fastly-Client-IP': '192.147.117.11',
    'Perf-Br-Req-In': '1529585370.116',
    'X-Timer': 'S1529585370.068237,VS0,VS0',
    'Fastly-FF':
      'dc/x3e9z8KMmlHLQr8BEvVMmTcpl3y2YY5y6gjSJa3g=!LCY!cache-lcy19249-LCY, dc/x3e9z8KMmlHLQr8BEvVMmTcpl3y2YY5y6gjSJa3g=!LCY!cache-lcy19227-LCY, dc/x3e9z8KMmlHLQr8BEvVMmTcpl3y2YY5y6gjSJa3g=!IAD!cache-iad2127-IAD, dc/x3e9z8KMmlHLQr8BEvVMmTcpl3y2YY5y6gjSJa3g=!IAD!cache-iad2133-IAD',
    'Accept-Encoding': 'gzip',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Safari/537.36',
  },
  repo: 'soupdemo',
  ref: 'master',
  selector: 'md',
};

const params404 = {
  path: '/non_existent_file.md',
  __ow_method: 'get',
  owner: 'trieloff',
  __ow_headers: {
    'X-Forwarded-Port': '443',
    'X-CDN-Request-Id': '2a208a89-e071-44cf-aee9-220880da4c1e',
    'Fastly-Client': '1',
    'X-Forwarded-Host': 'runtime.adobe.io',
    'Upgrade-Insecure-Requests': '1',
    Host: 'controller-a',
    Connection: 'close',
    'Fastly-SSL': '1',
    'X-Request-Id': 'RUss5tPdgOfw74a68aNc24FeTipGpVfW',
    'X-Branch': 'master',
    'Accept-Language': 'en-US, en;q=0.9, de;q=0.8',
    'X-Forwarded-Proto': 'https',
    'Fastly-Orig-Accept-Encoding': 'gzip',
    'X-Varnish': '267021320',
    DNT: '1',
    'X-Forwarded-For':
      '192.147.117.11, 157.52.92.27, 23.235.46.33, 10.64.221.107',
    'X-Host': 'www.primordialsoup.life',
    Accept:
      'text/html, application/xhtml+xml, application/xml;q=0.9, image/webp, image/apng, */*;q=0.8',
    'X-Real-IP': '10.64.221.107',
    'X-Forwarded-Server': 'cache-lcy19249-LCY, cache-iad2127-IAD',
    'Fastly-Client-IP': '192.147.117.11',
    'Perf-Br-Req-In': '1529585370.116',
    'X-Timer': 'S1529585370.068237,VS0,VS0',
    'Fastly-FF':
      'dc/x3e9z8KMmlHLQr8BEvVMmTcpl3y2YY5y6gjSJa3g=!LCY!cache-lcy19249-LCY, dc/x3e9z8KMmlHLQr8BEvVMmTcpl3y2YY5y6gjSJa3g=!LCY!cache-lcy19227-LCY, dc/x3e9z8KMmlHLQr8BEvVMmTcpl3y2YY5y6gjSJa3g=!IAD!cache-iad2127-IAD, dc/x3e9z8KMmlHLQr8BEvVMmTcpl3y2YY5y6gjSJa3g=!IAD!cache-iad2133-IAD',
    'Accept-Encoding': 'gzip',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Safari/537.36',
  },
  repo: 'soupdemo',
  ref: 'master',
  selector: 'md',
};

const secrets = {
  REPO_RAW_ROOT: 'https://raw.githubusercontent.com/',
};

describe('Testing HTML Pipeline', () => {
  setupPolly({
    logging: false,
    recordFailedRequests: true,
    adapters: [NodeHttpAdapter],
    persister: FSPersister,
    persisterOptions: {
      fs: {
        recordingsDir: 'test/fixtures',
      },
    },
  });

  it('html.pipe is a function', () => {
    assert.ok(pipe);
    assert.strictEqual(typeof pipe, 'function');
  });

  it('html.pipe does not make HTTP requests if body is provided', async () => {
    const result = await pipe(
      ({ content }) => {
        // this is the main function (normally it would be the template function)
        // but we use it to assert that pre-processing has happened
        assert.equal(content.body, 'Hello World');
        // and return a different status code
        return { response: { status: 201, body: content.document.body.innerHTML } };
      },
      {
        content: {
          body: 'Hello World',
        },
      },
      {
        request: { params },
        secrets,
        logger,
      },
    );

    assert.equal(result.response.status, 201);
    assert.equal(result.response.headers['Content-Type'], 'text/html');
    assert.equal(result.response.headers['X-ESI'], undefined);
    assert.equal(result.response.body, '<p>Hello World</p>');
  });

  it('html.pipe detects ESI in response body', async () => {
    const result = await pipe(
      ({ content }) => ({ response: { body: `${content.document.body.innerHTML}<esi:include src="foo.html">` } }),
      {
        content: {
          body: 'Hello World',
        },
      },
      {
        request: { params },
        secrets,
        logger,
      },
    );

    assert.equal(result.response.headers['X-ESI'], 'enabled');
    assert.equal(result.response.headers['Content-Type'], 'text/html');
    assert.equal(result.response.body, '<p>Hello World</p><esi:include src="foo.html">');
  });

  it('html.pipe renders index.md from helix-cli correctly', async () => {
    const result = await pipe(
      ({ content }) => {
        // this is the main function (normally it would be the template function)
        // but we use it to assert that pre-processing has happened
        assert.equal(content.title, 'Helix - {{project.name}}');
        assert.equal(content.image, './helix_logo.png');
        assert.equal(content.intro, 'It works! {{project.name}} is up and running.');
        // and return a different status code
        return { response: { status: 201, body: content.document.body.innerHTML } };
      },
      {
        content: {
          body: fs.readFileSync(path.resolve(__dirname, 'fixtures/index-unmodified.md')).toString(),
        },
      },
      {
        request: { params },
        secrets,
        logger,
      },
    );
    assert.equal(result.error, undefined);
    assert.notEqual(result.response.status, 500);
  });

  it('html.pipe renders index.md from project-helix.io correctly', async () => {
    const result = await pipe(
      ({ content }) => {
        // this is the main function (normally it would be the template function)
        // but we use it to assert that pre-processing has happened
        assert.equal(content.title, 'Welcome to Project Helix');
        assert.equal(content.image, 'assets/browser.png');
        assert.equal(content.intro, 'Helix is the new experience management service to create, manage, and deliver great digital experiences.');
        // and return a different status code
        return { response: { status: 201, body: content.document.body.innerHTML } };
      },
      {
        content: {
          body: fs.readFileSync(path.resolve(__dirname, 'fixtures/index-projecthelixio.md')).toString(),
        },
      },
      {
        request: { params },
        secrets,
        logger,
      },
    );
    assert.equal(result.error, undefined);
    assert.notEqual(500, result.response.status);
  });

  it('html.pipe renders modified index.md from helix-cli correctly', async () => {
    const result = await pipe(
      ({ content }) => {
        // this is the main function (normally it would be the template function)
        // but we use it to assert that pre-processing has happened
        assert.equal(content.title, 'Helix - {{project.name}}');
        assert.equal(content.image, undefined);
        assert.equal(content.intro, 'It works! {{project.name}} is up and running.');
        // and return a different status code
        return { response: { status: 201, body: content.document.body.innerHTML } };
      },
      {
        content: {
          body: fs.readFileSync(path.resolve(__dirname, 'fixtures/index-modified.md')).toString(),
        },
      },
      {
        request: { params },
        secrets,
        logger,
      },
    );
    assert.equal(result.error, undefined);
    assert.notEqual(500, result.response.status);
  });

  it('html.pipe complains when context is invalid', async () => {
    const result = await pipe(
      ({ content }) => ({ response: { status: 201, body: content.document.body.innerHTML } }),
      {
        content: {
          foo: 'Hello World',
        },
      },
      {
        request: { params },
        secrets,
        logger,
      },
    );
    assert.ok(result.error);
    assert.equal(result.error.split('\n')[1], 'Error: Invalid Context at step 0');
    assert.equal(result.error.split('\n')[2], 'data.content should NOT have additional properties');
  });

  it('html.pipe complains when action is invalid', async () => {
    const result = await pipe(
      ({ content }) => ({ response: { status: 201, body: content.document.body.innerHTML } }),
      {
        content: {
          body: 'Hello World',
        },
      },
      {
        request: { params },
        secrets,
        logger,
        break: true,
      },
    );
    assert.ok(result.error);
    assert.equal(result.error.split('\n')[1], 'Error: Invalid Action at step 0');
    assert.equal(result.error.split('\n')[2], 'data should NOT have additional properties');
  });

  it('html.pipe makes HTTP requests', async () => {
    const result = await pipe(
      ({ content }) => {
        // this is the main function (normally it would be the template function)
        // but we use it to assert that pre-processing has happened
        assert.ok(content.body);
        assert.ok(content.mdast);
        assert.ok(content.meta);
        assert.ok(content.document);
        assert.equal(typeof content.document.getElementsByTagName, 'function');
        assert.equal(content.document.getElementsByTagName('h1').length, 1);
        assert.equal(content.document.getElementsByTagName('h1')[0].innerHTML, 'Bill, Welcome to the future');
        assert.equal(content.meta.template, 'Medium');
        assert.equal(content.intro, 'Project Helix');
        assert.equal(content.title, 'Bill, Welcome to the future');
        assert.deepEqual(content.sources, ['https://raw.githubusercontent.com/trieloff/soupdemo/master/hello.md']);
        // and return a different status code
        return { response: { status: 201, body: content.document.body.innerHTML } };
      },
      {
        request: {
          params: {
          },
        },
      },
      {
        request: { params },
        secrets,
        logger,
      },
    );

    const res = result.response;
    assert.equal(res.status, 201);
    assert.equal(res.headers['Content-Type'], 'text/html');
    assert.equal(res.headers['Cache-Control'], 's-maxage=604800');
    assert.equal(res.headers['Surrogate-Key'], 'h/WhVujl+n6KANwYWB57fhkvjfzzACeSawAAndzWdK0=');
    assert.equal(res.body[0], '<');
    assert.ok(res.body.match(/srcset/));
  });

  it('html.pipe makes HTTP requests and falls back to master', async () => {
    const myparams = Object.assign({}, params);
    delete myparams.ref;

    const result = await pipe(
      ({ content }) => {
        // this is the main function (normally it would be the template function)
        // but we use it to assert that pre-processing has happened
        assert.ok(content.body);
        assert.ok(content.mdast);
        assert.ok(content.meta);
        assert.ok(content.document);
        assert.equal(typeof content.document.getElementsByTagName, 'function');
        assert.equal(content.document.getElementsByTagName('h1').length, 1);
        assert.equal(content.document.getElementsByTagName('h1')[0].innerHTML, 'Bill, Welcome to the future');
        assert.equal(content.meta.template, 'Medium');
        assert.equal(content.intro, 'Project Helix');
        assert.equal(content.title, 'Bill, Welcome to the future');
        assert.deepEqual(content.sources, ['https://raw.githubusercontent.com/trieloff/soupdemo/master/hello.md']);
        // and return a different status code
        return { response: { status: 201, body: content.document.body.innerHTML } };
      },
      {
        request: {
          params: {
          },
        },
      },
      {
        request: { params: myparams },
        secrets,
        logger,
      },
    );

    const res = result.response;
    assert.equal(res.status, 201);
    assert.equal(res.headers['Content-Type'], 'text/html');
    assert.equal(res.headers['Cache-Control'], 's-maxage=604800');
    assert.equal(res.headers['Surrogate-Key'], 'h/WhVujl+n6KANwYWB57fhkvjfzzACeSawAAndzWdK0=');
    assert.equal(res.body[0], '<');
    assert.ok(res.body.match(/srcset/));
  });

  it('html.pipe serves 404 for non existent content', async () => {
    const result = await pipe(
      // this is the main function (normally it would be the template function)
      () => ({ response: { body: '<html></html>' } }),
      {
        request: {
          params: {
          },
        },
      },
      {
        request: { params: params404 },
        secrets,
        logger,
      },
    );

    const res = result.response;
    assert.equal(res.status, 404);
  });

  it('html.pipe keeps existing headers', async () => {
    const result = await pipe(
      ({ content }) => ({
        response: {
          status: 201,
          body: content.document.body.innerHTML,
          headers: {
            'Content-Type': 'text/plain',
            'Surrogate-Key': 'foobar',
            'Cache-Control': 'max-age=0',
          },
        },
      }),
      {},
      {
        request: { params },
        secrets,
        logger,
      },
    );

    assert.equal(result.response.status, 201);
    assert.equal(result.response.headers['Content-Type'], 'text/plain');
    assert.equal(result.response.headers['Cache-Control'], 'max-age=0');
    assert.equal(result.response.headers['Surrogate-Key'], 'foobar');
  });

  it('html.pipe produces debug dumps', async () => {
    const result = await pipe(
      ({ content }) => ({
        response: {
          status: 201,
          body: content.document.body.innerHTML,
          headers: {
            'Content-Type': 'text/plain',
            'Surrogate-Key': 'foobar',
          },
        },
      }),
      {},
      {
        request: { params },
        secrets,
        logger,
      },
    );

    assert.equal(result.response.status, 201);
    assert.equal(result.response.headers['Content-Type'], 'text/plain');
    assert.equal(result.response.headers['Surrogate-Key'], 'foobar');

    const dir = await dump({}, {}, -1);
    const outdir = path.dirname(dir);
    const found = fs.readdirSync(outdir)
      .map(file => path.resolve(outdir, file))
      .map(full => fs.existsSync(full))
      .filter(e => !!e);
    assert.notEqual(found.length, 0);
  });
});
