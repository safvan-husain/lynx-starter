/**
 * A lightweight URL implementation for environments where the global URL
 * constructor is missing or restricted (like Lynx).
 * It supports basic parsing, protocol swapping, path joining, and query parameters.
 */
export class StdbUrl {
  protocol: string = '';
  host: string = '';
  pathname: string = '';
  private _params: Record<string, string> = {};

  constructor(url: string | StdbUrl, base?: string | StdbUrl) {
    if (url instanceof StdbUrl) {
      this.protocol = url.protocol;
      this.host = url.host;
      this.pathname = url.pathname;
      this._params = { ...url._params };
    } else {
      this.parse(url, base);
    }
  }

  private parse(urlStr: string, base?: string | StdbUrl) {
    let absoluteUrl = urlStr;

    // Handle relative paths by joining with base
    if (!/^[a-z]+:\/\//i.test(urlStr) && base) {
      const baseUrl = base instanceof StdbUrl ? base : new StdbUrl(base);
      this.protocol = baseUrl.protocol;
      this.host = baseUrl.host;
      this._params = { ...baseUrl._params };

      let baseContextPath = baseUrl.pathname;
      if (!baseContextPath.endsWith('/')) {
        // If base path doesn't end with slash, it's a file-like path, 
        // we take the directory part.
        baseContextPath = baseContextPath.substring(0, baseContextPath.lastIndexOf('/') + 1);
      }

      if (urlStr.startsWith('/')) {
        this.pathname = urlStr;
      } else {
        this.pathname = baseContextPath + urlStr;
      }
      return;
    }

    // Basic regex to split URL: protocol, host, pathname+search
    const match = urlStr.match(/^([a-z]+:)\/\/([^/]+)(.*)$/i);
    if (match) {
      this.protocol = match[1].toLowerCase();
      this.host = match[2];
      const rest = match[3] || '/';
      const [path, search] = rest.split('?');
      this.pathname = path || '/';
      if (search) {
        search.split('&').forEach(part => {
          const [key, val] = part.split('=');
          if (key) this._params[decodeURIComponent(key)] = val ? decodeURIComponent(val) : '';
        });
      }
    } else {
      // Fallback for just pathname/search if no protocol
      const [path, search] = urlStr.split('?');
      this.pathname = path || '/';
      if (search) {
        search.split('&').forEach(part => {
          const [key, val] = part.split('=');
          if (key) this._params[decodeURIComponent(key)] = val ? decodeURIComponent(val) : '';
        });
      }
    }
  }

  get searchParams() {
    return {
      set: (key: string, value: string) => {
        this._params[key] = value;
      },
      get: (key: string) => {
        return this._params[key] || null;
      },
      delete: (key: string) => {
        delete this._params[key];
      }
    };
  }

  toString(): string {
    let url = '';
    if (this.protocol && this.host) {
      url += `${this.protocol}//${this.host}`;
    }
    url += this.pathname;
    const query = Object.entries(this._params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    if (query) {
      url += `?${query}`;
    }
    return url;
  }
}
