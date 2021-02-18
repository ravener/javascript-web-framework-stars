const fs = require("fs");
const https = require("https");
const list = require("./list.json");

const tableHeader = `
| Project Name | Stars | Forks | Open Issues | Description | Last Commit |
| ------------ | ----- | ----- | ----------- | ----------- | ----------- |
`;

let readme = `# Top JavaScript Web Frameworks
A list of popular JavaScript web frameworks for [Node.js](https://nodejs.org) and [Deno](https://deno.land) ranked by stars automatically.

Please update **list.json** (via Pull Request)

Inspired by [go-web-framework-stars](https://github.com/mingrammar/go-web*framework-stars)

## Node.js Frameworks
${tableHeader}
`;

const token = fs.readFileSync("access_token.txt").toString().trim();


if(!token) {
  console.error("A GitHub access token must be present in access_token.txt to use this script.");
  process.exit(1);
}



function fetchJSON(url) {
  console.log(`GET ${url}`);

  return new Promise((resolve, reject) => {
    return https.get(url, {
      headers: { "Content-Type": "application/json", "User-Agent": "https://github.com/ravener/javascript-web-framework-stars" }
    }, (res) => {
      if(res.statusCode != 200) return reject(new Error(`HTTP Returned ${res.statusCode}`));


      const buffer = [];

      return res
        .on("data", (chunk) => buffer.push(chunk))
        .on("end", () => resolve(JSON.parse(Buffer.concat(buffer))))
        .on("error", (err) => reject(err));
    }).on("error", (err) => reject(err));
  });
}

async function fetchRepo(repo) {
  const {
    stargazers_count, html_url, forks_count, open_issues_count,
    default_branch, name, description
  } = await fetchJSON(`https://api.github.com/repos/${repo}?access_token=${token}`);

  const { commit: { committer: { date } } } = await fetchJSON(`https://api.github.com/repos/${repo}/commits/${default_branch}?access_token=${token}`);

  return {
    stars: stargazers_count,
    url: html_url,
    name: name,
    forks: forks_count,
    issues: open_issues_count,
    description: description,
    lastCommit: new Date(date)
  };
}

async function fetchRepos() {
  const results = { node: [], deno: [] };

  // Fetch Node.js frameworks.
  for(const repo of list.node) results.node.push(await fetchRepo(repo));
  // Fetch Deno frameworks.
  for(const repo of list.deno) results.deno.push(await fetchRepo(repo));

  return results;
}

function writeTableLine(fr) {
  return `| [${fr.name}](${fr.url}) | ${fr.stars} | ${fr.forks} | ${fr.issues} | ${fr.description} | ${fr.lastCommit.toLocaleString()} | \n`;
}

(async() => {
  const { node, deno } = await fetchRepos();

  for(const repo of node) {
    readme += writeTableLine(repo);
  }

  readme += `\n## Deno Frameworks\n${tableHeader}`;

  for(const repo of deno) {
    readme += writeTableLine(repo);
  }

  fs.writeFileSync("README.md", readme);
})();
