package io.jenkins.plugins.horizon.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ScmLinkResolverTest {

    @Test
    void testNormalizeToWebUrl() {
        // GitHub HTTPS and SSH
        assertEquals("https://github.com/owner/repo", 
                ScmLinkResolver.normalizeToWebUrl("https://github.com/owner/repo.git"));
        assertEquals("https://github.com/owner/repo", 
                ScmLinkResolver.normalizeToWebUrl("git@github.com:owner/repo.git"));
        assertEquals("https://github.com/owner/repo", 
                ScmLinkResolver.normalizeToWebUrl("https://token:ghp_12345@github.com/owner/repo.git"));
        assertEquals("https://github.com/owner/repo", 
                ScmLinkResolver.normalizeToWebUrl("ssh://git@github.com/owner/repo.git"));

        // GitLab
        assertEquals("https://gitlab.com/group/subgroup/project", 
                ScmLinkResolver.normalizeToWebUrl("git@gitlab.com:group/subgroup/project.git"));
        assertEquals("https://gitlab.internal.net/team/project", 
                ScmLinkResolver.normalizeToWebUrl("ssh://git@gitlab.internal.net:2222/team/project.git"));

        // Bitbucket Cloud
        assertEquals("https://bitbucket.org/workspace/repo", 
                ScmLinkResolver.normalizeToWebUrl("git@bitbucket.org:workspace/repo.git"));

        // Bitbucket Server / Data Center
        assertEquals("https://bitbucket.corp.com/projects/PROJ/repos/my-service", 
                ScmLinkResolver.normalizeToWebUrl("https://bitbucket.corp.com/scm/PROJ/my-service.git"));

        // Azure DevOps
        assertEquals("https://dev.azure.com/org/project/_git/repo", 
                ScmLinkResolver.normalizeToWebUrl("https://dev.azure.com/org/project/_git/repo.git"));

        // Null and empty
        assertNull(ScmLinkResolver.normalizeToWebUrl(null));
        assertNull(ScmLinkResolver.normalizeToWebUrl("   "));
    }

    @Test
    void testBuildCommitUrl() {
        String sha = "8a3e7b1c4d";

        assertEquals("https://github.com/owner/repo/commit/8a3e7b1c4d",
                ScmLinkResolver.buildCommitUrl("https://github.com/owner/repo", sha));

        assertEquals("https://gitlab.com/group/repo/-/commit/8a3e7b1c4d",
                ScmLinkResolver.buildCommitUrl("https://gitlab.com/group/repo", sha));

        assertEquals("https://bitbucket.org/workspace/repo/commits/8a3e7b1c4d",
                ScmLinkResolver.buildCommitUrl("https://bitbucket.org/workspace/repo", sha));

        assertEquals("https://bb.corp.com/projects/PROJ/repos/repo/commits/8a3e7b1c4d",
                ScmLinkResolver.buildCommitUrl("https://bb.corp.com/projects/PROJ/repos/repo", sha));

        assertEquals("https://dev.azure.com/org/proj/_git/repo/commit/8a3e7b1c4d",
                ScmLinkResolver.buildCommitUrl("https://dev.azure.com/org/proj/_git/repo", sha));

        assertNull(ScmLinkResolver.buildCommitUrl(null, sha));
        assertNull(ScmLinkResolver.buildCommitUrl("https://github.com/owner/repo", null));
    }

    @Test
    void testBuildBranchAndPrUrl() {
        // GitHub standard branch
        assertEquals("https://github.com/owner/repo/tree/main",
                ScmLinkResolver.buildBranchUrl("https://github.com/owner/repo", "main"));
        assertEquals("https://github.com/owner/repo/tree/feature%2Flogin-ui",
                ScmLinkResolver.buildBranchUrl("https://github.com/owner/repo", "origin/feature/login-ui"));

        // GitHub PR
        assertEquals("https://github.com/owner/repo/pull/42",
                ScmLinkResolver.buildBranchUrl("https://github.com/owner/repo", "PR-42"));

        // GitLab branch and MR
        assertEquals("https://gitlab.com/group/repo/-/tree/develop",
                ScmLinkResolver.buildBranchUrl("https://gitlab.com/group/repo", "develop"));
        assertEquals("https://gitlab.com/group/repo/-/merge_requests/108",
                ScmLinkResolver.buildBranchUrl("https://gitlab.com/group/repo", "MR-108"));

        // Bitbucket Cloud
        assertEquals("https://bitbucket.org/workspace/repo/branch/release-2.0",
                ScmLinkResolver.buildBranchUrl("https://bitbucket.org/workspace/repo", "release-2.0"));
        assertEquals("https://bitbucket.org/workspace/repo/pull-requests/7",
                ScmLinkResolver.buildBranchUrl("https://bitbucket.org/workspace/repo", "PR-7"));

        // Bitbucket Server
        assertEquals("https://bb.corp.com/projects/PROJ/repos/repo/browse?at=refs%2Fheads%2Fmain",
                ScmLinkResolver.buildBranchUrl("https://bb.corp.com/projects/PROJ/repos/repo", "main"));
        assertEquals("https://bb.corp.com/projects/PROJ/repos/repo/pull-requests/19/overview",
                ScmLinkResolver.buildBranchUrl("https://bb.corp.com/projects/PROJ/repos/repo", "PR-19"));

        // Azure DevOps
        assertEquals("https://dev.azure.com/org/proj/_git/repo?version=GBmain",
                ScmLinkResolver.buildBranchUrl("https://dev.azure.com/org/proj/_git/repo", "main"));

        assertNull(ScmLinkResolver.buildBranchUrl(null, "main"));
        assertNull(ScmLinkResolver.buildBranchUrl("https://github.com/owner/repo", null));
    }

    @Test
    void testResolveFromRemoteUrl() {
        ScmLinkResolver.ScmLinks links = ScmLinkResolver.resolveFromRemoteUrl(
                "git@github.com:reder9/pipeline-horizon-jenkins-plugin.git",
                "e5f4c45e",
                "main"
        );

        assertNotNull(links);
        assertEquals("https://github.com/reder9/pipeline-horizon-jenkins-plugin", links.getRepositoryUrl());
        assertEquals("https://github.com/reder9/pipeline-horizon-jenkins-plugin/commit/e5f4c45e", links.getCommitUrl());
        assertEquals("https://github.com/reder9/pipeline-horizon-jenkins-plugin/tree/main", links.getBranchUrl());
    }
}
