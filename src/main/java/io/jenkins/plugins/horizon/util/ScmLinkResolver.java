package io.jenkins.plugins.horizon.util;

import hudson.scm.ChangeLogSet;
import hudson.scm.RepositoryBrowser;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject;

import java.io.UnsupportedEncodingException;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class ScmLinkResolver {

    private static final Pattern SCP_PATTERN = Pattern.compile("^[a-zA-Z0-9_.-]+@([a-zA-Z0-9_.-]+):([^/].*)$");
    private static final Pattern CREDENTIALS_PATTERN = Pattern.compile("^(https?://)[^/@]+@(.+)$");
    private static final Pattern PR_PATTERN = Pattern.compile("^(?:PR-|pull/|merge-requests/|MR-)?(\\d+)$", Pattern.CASE_INSENSITIVE);

    private ScmLinkResolver() {
    }

    public static class ScmLinks {
        private String repositoryUrl;
        private String commitUrl;
        private String branchUrl;

        public ScmLinks() {
        }

        public ScmLinks(String repositoryUrl, String commitUrl, String branchUrl) {
            this.repositoryUrl = repositoryUrl;
            this.commitUrl = commitUrl;
            this.branchUrl = branchUrl;
        }

        public String getRepositoryUrl() {
            return repositoryUrl;
        }

        public void setRepositoryUrl(String repositoryUrl) {
            this.repositoryUrl = repositoryUrl;
        }

        public String getCommitUrl() {
            return commitUrl;
        }

        public void setCommitUrl(String commitUrl) {
            this.commitUrl = commitUrl;
        }

        public String getBranchUrl() {
            return branchUrl;
        }

        public void setBranchUrl(String branchUrl) {
            this.branchUrl = branchUrl;
        }
    }

    /**
     * Resolves repository, commit, and branch web links for a given pipeline run.
     */
    public static ScmLinks resolve(WorkflowRun run, String commitSha, String branch) {
        if (run == null) {
            return null;
        }

        String repoWebUrl = null;
        String browserCommitUrl = null;

        // 1. Check ChangeLogSet repository browser
        try {
            List<ChangeLogSet<? extends ChangeLogSet.Entry>> changeSets = run.getChangeSets();
            for (ChangeLogSet<? extends ChangeLogSet.Entry> cs : changeSets) {
                if (cs != null) {
                    @SuppressWarnings({"rawtypes", "unchecked"})
                    RepositoryBrowser browser = cs.getBrowser();
                    if (browser != null) {
                        for (ChangeLogSet.Entry entry : cs) {
                            if (entry != null) {
                                try {
                                    @SuppressWarnings("unchecked")
                                    URL link = browser.getChangeSetLink(entry);
                                    if (link != null) {
                                        browserCommitUrl = link.toExternalForm();
                                        break;
                                    }
                                } catch (Throwable ignored) {
                                }
                            }
                        }
                    }
                }
                if (browserCommitUrl != null) {
                    break;
                }
            }
        } catch (Throwable ignored) {
        }

        // 2. Discover Git remote URLs from BuildData action
        try {
            for (hudson.model.Action a : run.getAllActions()) {
                if (a != null && a.getClass().getName().contains("BuildData")) {
                    try {
                        Object urlsObj = a.getClass().getMethod("getRemoteUrls").invoke(a);
                        if (urlsObj instanceof Collection) {
                            Collection<?> urls = (Collection<?>) urlsObj;
                            if (!urls.isEmpty()) {
                                Object first = urls.iterator().next();
                                if (first != null) {
                                    repoWebUrl = normalizeToWebUrl(String.valueOf(first));
                                    if (repoWebUrl != null) {
                                        break;
                                    }
                                }
                            }
                        }
                    } catch (Throwable ignored) {
                    }
                }
            }
        } catch (Throwable ignored) {
        }

        // 3. Check MultiBranch project SCMSources if remote not yet found
        if (repoWebUrl == null && run.getParent().getParent() instanceof WorkflowMultiBranchProject) {
            WorkflowMultiBranchProject mbp = (WorkflowMultiBranchProject) run.getParent().getParent();
            repoWebUrl = extractRepoUrlFromMultiBranch(mbp);
        }

        if (repoWebUrl == null && browserCommitUrl != null) {
            // Can extract base repo from browser commit URL if possible
            repoWebUrl = extractBaseRepoFromCommitUrl(browserCommitUrl);
        }

        if (repoWebUrl == null) {
            if (browserCommitUrl != null) {
                return new ScmLinks(null, browserCommitUrl, null);
            }
            return null;
        }

        ScmLinks links = resolveFromRemoteUrl(repoWebUrl, commitSha, branch);
        if (browserCommitUrl != null) {
            links.setCommitUrl(browserCommitUrl);
        }
        return links;
    }

    /**
     * Resolves SCM links for a branch within a MultiBranch project.
     */
    public static ScmLinks resolveForBranch(WorkflowMultiBranchProject project, WorkflowJob branchJob, WorkflowRun lastRun, String branchName) {
        String commitSha = null;
        if (lastRun != null) {
            try {
                for (ChangeLogSet<? extends ChangeLogSet.Entry> cs : lastRun.getChangeSets()) {
                    for (ChangeLogSet.Entry entry : cs) {
                        if (entry != null && entry.getCommitId() != null) {
                            commitSha = entry.getCommitId();
                            break;
                        }
                    }
                    if (commitSha != null) {
                        break;
                    }
                }
            } catch (Throwable ignored) {
            }

            if (commitSha == null) {
                for (hudson.model.Action a : lastRun.getAllActions()) {
                    if (a != null) {
                        String name = a.getClass().getName();
                        if (name.contains("SCMRevisionAction")) {
                            try {
                                Object rev = a.getClass().getMethod("getRevision").invoke(a);
                                if (rev != null) {
                                    try {
                                        Object h = rev.getClass().getMethod("getHash").invoke(rev);
                                        if (h != null) {
                                            commitSha = String.valueOf(h);
                                        }
                                    } catch (Throwable t) {
                                        commitSha = String.valueOf(rev);
                                    }
                                }
                            } catch (Throwable ignored) {
                            }
                        } else if (name.contains("BuildData")) {
                            try {
                                Object rev = a.getClass().getMethod("getLastBuiltRevision").invoke(a);
                                if (rev != null) {
                                    Object sha = rev.getClass().getMethod("getSha1String").invoke(rev);
                                    if (sha != null) {
                                        commitSha = String.valueOf(sha);
                                    }
                                }
                            } catch (Throwable ignored) {
                            }
                        }
                        if (commitSha != null) {
                            break;
                        }
                    }
                }
            }

            ScmLinks links = resolve(lastRun, commitSha, branchName);
            if (links != null) {
                return links;
            }
        }

        // Fallback directly from MultiBranch project configuration
        String repoWebUrl = (project != null) ? extractRepoUrlFromMultiBranch(project) : null;
        if (repoWebUrl != null) {
            return resolveFromRemoteUrl(repoWebUrl, commitSha, branchName);
        }
        return null;
    }

    /**
     * Resolves links directly from a normalized or raw remote Git URL.
     */
    public static ScmLinks resolveFromRemoteUrl(String remoteUrl, String commitSha, String branch) {
        String repoWebUrl = normalizeToWebUrl(remoteUrl);
        if (repoWebUrl == null) {
            return null;
        }
        String commitUrl = buildCommitUrl(repoWebUrl, commitSha);
        String branchUrl = buildBranchUrl(repoWebUrl, branch);
        return new ScmLinks(repoWebUrl, commitUrl, branchUrl);
    }

    /**
     * Converts SSH, Git, or HTTPS repository clone URLs to a standard browser web URL.
     */
    public static String normalizeToWebUrl(String remoteUrl) {
        if (remoteUrl == null || remoteUrl.trim().isEmpty()) {
            return null;
        }
        String url = remoteUrl.trim();

        // 1. Remove embedded auth tokens (e.g. https://token:x@github.com/... -> https://github.com/...)
        Matcher credMatch = CREDENTIALS_PATTERN.matcher(url);
        if (credMatch.matches()) {
            url = credMatch.group(1) + credMatch.group(2);
        }

        // 2. Handle SCP-like SSH URLs: git@host:owner/repo.git
        Matcher scpMatch = SCP_PATTERN.matcher(url);
        if (scpMatch.matches()) {
            String host = scpMatch.group(1);
            String path = scpMatch.group(2);
            url = "https://" + host + "/" + path;
        } else if (url.startsWith("ssh://")) {
            // ssh://[user@]host[:port]/path/to/repo.git
            String rest = url.substring("ssh://".length());
            int atIdx = rest.indexOf('@');
            if (atIdx >= 0) {
                rest = rest.substring(atIdx + 1);
            }
            int slashIdx = rest.indexOf('/');
            if (slashIdx >= 0) {
                String hostPort = rest.substring(0, slashIdx);
                String path = rest.substring(slashIdx + 1);
                int colonIdx = hostPort.indexOf(':');
                String host = colonIdx >= 0 ? hostPort.substring(0, colonIdx) : hostPort;
                url = "https://" + host + "/" + path;
            }
        } else if (url.startsWith("git://")) {
            url = "https://" + url.substring("git://".length());
        }

        // 3. Strip trailing .git and slashes
        if (url.endsWith(".git")) {
            url = url.substring(0, url.length() - 4);
        }
        while (url.endsWith("/")) {
            url = url.substring(0, url.length() - 1);
        }

        // 4. Bitbucket Server / Data Center conversion:
        // Clone URL: https://bitbucket.corp.com/scm/PROJ/repo -> Web URL: https://bitbucket.corp.com/projects/PROJ/repos/repo
        Pattern bbServerPattern = Pattern.compile("^(https?://[^/]+)/scm/([^/]+)/([^/]+)$", Pattern.CASE_INSENSITIVE);
        Matcher bbMatch = bbServerPattern.matcher(url);
        if (bbMatch.matches()) {
            url = bbMatch.group(1) + "/projects/" + bbMatch.group(2) + "/repos/" + bbMatch.group(3);
        }

        return url;
    }

    /**
     * Constructs a web link for a specific commit SHA based on SCM provider conventions.
     */
    public static String buildCommitUrl(String repoWebUrl, String commitSha) {
        if (repoWebUrl == null || commitSha == null || commitSha.trim().isEmpty()) {
            return null;
        }
        String cleanSha = commitSha.trim();
        String lowerUrl = repoWebUrl.toLowerCase(Locale.ROOT);

        if (lowerUrl.contains("gitlab")) {
            return repoWebUrl + "/-/commit/" + cleanSha;
        } else if (lowerUrl.contains("bitbucket.org")) {
            return repoWebUrl + "/commits/" + cleanSha;
        } else if (lowerUrl.contains("/projects/") && lowerUrl.contains("/repos/")) {
            // Bitbucket Server / Data Center
            return repoWebUrl + "/commits/" + cleanSha;
        } else if (lowerUrl.contains("dev.azure.com") || lowerUrl.contains("visualstudio.com")) {
            return repoWebUrl + "/commit/" + cleanSha;
        } else {
            // GitHub, Gitea, Forgejo, etc.
            return repoWebUrl + "/commit/" + cleanSha;
        }
    }

    /**
     * Constructs a web link for a branch or Pull/Merge Request based on SCM provider conventions.
     */
    public static String buildBranchUrl(String repoWebUrl, String branch) {
        if (repoWebUrl == null || branch == null || branch.trim().isEmpty()) {
            return null;
        }
        String cleanBranch = branch.trim();
        if (cleanBranch.startsWith("origin/")) {
            cleanBranch = cleanBranch.substring("origin/".length());
        } else if (cleanBranch.startsWith("refs/heads/")) {
            cleanBranch = cleanBranch.substring("refs/heads/".length());
        }

        String lowerUrl = repoWebUrl.toLowerCase(Locale.ROOT);
        boolean isPr = cleanBranch.startsWith("PR-") || cleanBranch.startsWith("pr-") || cleanBranch.startsWith("MR-") || cleanBranch.startsWith("mr-");
        String prNum = null;
        if (isPr) {
            Matcher m = PR_PATTERN.matcher(cleanBranch);
            if (m.matches()) {
                prNum = m.group(1);
            }
        }

        if (lowerUrl.contains("gitlab")) {
            if (prNum != null) {
                return repoWebUrl + "/-/merge_requests/" + prNum;
            }
            return repoWebUrl + "/-/tree/" + urlEncode(cleanBranch);
        } else if (lowerUrl.contains("bitbucket.org")) {
            if (prNum != null) {
                return repoWebUrl + "/pull-requests/" + prNum;
            }
            return repoWebUrl + "/branch/" + urlEncode(cleanBranch);
        } else if (lowerUrl.contains("/projects/") && lowerUrl.contains("/repos/")) {
            // Bitbucket Server / Data Center
            if (prNum != null) {
                return repoWebUrl + "/pull-requests/" + prNum + "/overview";
            }
            return repoWebUrl + "/browse?at=refs%2Fheads%2F" + urlEncode(cleanBranch);
        } else if (lowerUrl.contains("dev.azure.com") || lowerUrl.contains("visualstudio.com")) {
            if (prNum != null) {
                return repoWebUrl + "/pullrequest/" + prNum;
            }
            return repoWebUrl + "?version=GB" + urlEncode(cleanBranch);
        } else if (lowerUrl.contains("gitea") || lowerUrl.contains("forgejo")) {
            if (prNum != null) {
                return repoWebUrl + "/pulls/" + prNum;
            }
            return repoWebUrl + "/src/branch/" + urlEncode(cleanBranch);
        } else {
            // GitHub default
            if (prNum != null) {
                return repoWebUrl + "/pull/" + prNum;
            }
            return repoWebUrl + "/tree/" + urlEncode(cleanBranch);
        }
    }

    private static String extractRepoUrlFromMultiBranch(WorkflowMultiBranchProject mbp) {
        try {
            for (Object src : mbp.getSCMSources()) {
                if (src == null) {
                    continue;
                }
                // Try GitSCMSource.getRemote()
                try {
                    Object remote = src.getClass().getMethod("getRemote").invoke(src);
                    if (remote != null) {
                        String normalized = normalizeToWebUrl(String.valueOf(remote));
                        if (normalized != null) {
                            return normalized;
                        }
                    }
                } catch (Throwable ignored) {
                }

                // Try GitHubSCMSource.getRepositoryUrl() or serverUrl + repoOwner + repository
                try {
                    Object repoUrl = src.getClass().getMethod("getRepositoryUrl").invoke(src);
                    if (repoUrl != null) {
                        String normalized = normalizeToWebUrl(String.valueOf(repoUrl));
                        if (normalized != null) {
                            return normalized;
                        }
                    }
                } catch (Throwable ignored) {
                }

                try {
                    Object repoOwner = src.getClass().getMethod("getRepoOwner").invoke(src);
                    Object repository = src.getClass().getMethod("getRepository").invoke(src);
                    if (repoOwner != null && repository != null) {
                        return "https://github.com/" + repoOwner + "/" + repository;
                    }
                } catch (Throwable ignored) {
                }
            }
        } catch (Throwable ignored) {
        }
        return null;
    }

    private static String extractBaseRepoFromCommitUrl(String commitUrl) {
        if (commitUrl == null) {
            return null;
        }
        int commitIdx = commitUrl.indexOf("/commit/");
        if (commitIdx > 0) {
            return commitUrl.substring(0, commitIdx);
        }
        int commitsIdx = commitUrl.indexOf("/commits/");
        if (commitsIdx > 0) {
            return commitUrl.substring(0, commitsIdx);
        }
        int mrIdx = commitUrl.indexOf("/-/");
        if (mrIdx > 0) {
            return commitUrl.substring(0, mrIdx);
        }
        return null;
    }

    private static String urlEncode(String value) {
        try {
            return URLEncoder.encode(value, StandardCharsets.UTF_8.name())
                    .replace("+", "%20");
        } catch (UnsupportedEncodingException e) {
            return value;
        }
    }
}
