@title Versioning and Building

# Versioning and Building

One of the main goals of Nabu is "ease of use". While this module is powered by git, it does not the full power of git to the developer. Instead, it enforces its own workflow which still leaves some room for customization, but primarily focuses on making it easy to version your project and prepare your releases.

## Example

Before we dig into the details, which may sound overwhelming, let's focus on the steps you, as developer, need to do in a typical project which assumes we are building the project on the same server we are developing it on.

If you are starting a new project from scratch, these are the steps:

- you **create a project** as you normally would and start building your application
- you perform "right click > **commit**" along the way as you build, this can be to parts of the project or the whole project
- once you're happy with the first version of your project, you right click the project and hit "**release**"
- you head on over to your build server, clone the project and hit **build**
- you **add the environment(s)** you want to deploy to
- you **change any environment-specific parameters** in your project
- hit save and your environment-specific release is now **ready for deployment**

Of course, you continue working on your project, so:

- you again **commit** as you see fit
- once you are ready for a second **release** to another environment, right click the project and release it
- the build server already knows about your project so will automatically pull in any changes and create a new build
	- if needed you can further tweak the environment-specific parameters 

Ok, now that you have an overview of the day-to-day steps, let's get into the nitty gritty details of the system. While it is not entirely necessary to understand this in full, having an overview of the steps never hurts.

## Overview

To help you visualize the descriptive text below, here's an overview of what the git repo(s) look like:

[:.resources/diagram.png]

The development and building can be done on the same server or different servers. The "origin" and "build" remotes on the build server can be one git repo or multiple. For security reasons you may want to put your build environment in a more restricted git repo.

## Development

The development server is looking at a single version of the file system, it can not expose multiple branches at once to the developers, this would require multiple servers.
You can choose the branch that the development server is on:

- it can be a standard "develop" branch
- it can work directly onto the master branch
- you can work on a hotfix branch
- you can even use feature branches if needed, but that requires a slightly more complex setup

In Nabu Developer you can right click any resource entry inside a project and "commit" pending changes. They will be committed to whichever branch that server is running on. Note that a commit will also run all the deployment actions that are contained within the entry you selected (or a child thereof).

You can also right click a project and "release" it. This will run through a commit cycle to make sure all the changes are committed. It will search all tags with a format of "v<number>" and tag that last commit with a version number which is 1 higher than whatever the highest was up to that point.

So your main branch will have a bunch of commits and every so often (when you "release") a new tag will apear with an incremental version number, e.g. "v1", "v2",... There is no differentation between major, minor or patch versions, only an incremental number.

### Remote

If you register a remote called "origin" on the repository, the server will automatically push the changes from the current branch to the equivalent branch in the origin, both on commit and release.

If you want to use another name than "origin", you can change the system property ``git.remote``. Note however that this is applicable to all projects on the server.
If you require credentials to push, you need to configure the project using ``nabu.misc.git.Services.configure``. The credentials can also be configured in a management application that has the manage component that is distributed with this package.

## Building

The build system can run on the same development server or it can be run remotely on a dedicated build server. Apart from the original source, every step is identical.

If you want to build a remote project, you need to ``nabu.misc.git.Services.clone`` it. Note that the name should be the exact name of the project (this includes casing).

If you want to build a local project, you don't need to clone it, you can skip straight to building it. When you build a project that does not exist yet in the build directory, Nabu will automatically check for a project with that name on the server itself and clone it from there.

We assume at this point that the "origin" remote points to the upstream that is providing the changes. Nabu will pull the latest changes from this origin every time you build. By default we assume that we will be working on the "master" branch, though this can be configured to be a different branch.

Note that in the most simple setup where you did not do anything manual and are building on the same server as you are developing, you will be committing and releasing to master during development and pulling and building from that master branch during the build process.

**Advanced users**: You can however get arbitrarily more creative and complex with your setup. You can have your development server use the "develop" branch (or a subbranch thereof), squash commit changes to the master as you see fit, push those to the cloud and pull them remotely. The current implementation allows you to go pretty wild with your setup, but at that point you will have to add your own logic to make sure it works end-to-end.

### Releases

The module has two ways of working but by default it will check for the version tags we applied when we released the project. If a new version tag appears that is more recent than the last one the server built, it will start a new branch called "r<number>". For example if we have just released "v2" of your project, a branch "r2" will appear which will start from the commit that v2 points to.

The server will immediately make a subbranch of r2 called "r2.0". The last number is the patch version. This allows for hotfixing of a particular release.

In the beginning, nothing further will happen until you add an environment. For example suppose you ``nabu.misc.git.Services.addEnvironment`` an environment called "qlty". If we assume that your master branch contains all the dev data, we want a separate qlty branch that contains qlty data. What is the difference between these two environments? Environment specific configuration. For example the database connection in qlty will likely have different settings than the one in dev.

Once an environment is added, it will be added as a branch to the patch version "r2.0-qlty". If the environment was only added in r2.0, there is no previous version of the environment. Therefore, your qlty branch will have the exact same values as your dev branch.

If however, the qlty enviromnent was already added in r1.0-qlty and you had already configured some environment specific properties, they will automatically be applied in this branch as well. 

#### Merge

This happens through a merge process. Each artifact can have a merge script linked to it which will dictate how they are merged. Each artifact type with relevant environment properties has a standard merge script available. This means, unless you want to do something special, you don't have to worry about the scripts and everything will work automatically.

**Advanced users**: the scripting allows for very complex merge logic if needed though you will have to write your own Glue scripts to make it happen. These can be configured directly in the node (edit > properties > merge script) or alternatively you can host them on an endpoint that the build server can reach and simply put the link to that endpoint in the same properties location. Note that when you use our shared cloud-building service, there will be limits placed on the script capabilities.

As a sidenote, sometimes, during the lifetime of a project, you will need to spin up an additional environment that closely resembles an existing one. For example maybe you want a second qlty environment for a specific group of people in your company. You can choose to add a new environment and base it on an existing one, this means it will automatically take the envirnment parameters from that environment rather than dev.

Once everything is merged into your environment, the changes (if any) are committed and a tag will be applied called "r2.0-qlty-RC1" where RC stands for release candidate. Every time you update the environment specific parameters, a new RC will be tagged within the environment branch.

### Automatic Building

The server will check for updates to build every 10 minutes. There is a "build all" button in the accompanying web application that allows you to check for updates faster or you can specifically build a certain project.

### Encryption

Some parameters are automatically encrypted before they are stored on the filesystem (e.g. database passwords). The build process will also keep these passwords encrypted in the respective branches. They are only decrypted in memory when they are sent to the management application so they can be interpreted and changed by the user, they are encrypted again before the new values are stored.

### Hotfixing

As mentioned, the build server will make a branch "r2" based on the tag "v2".
From here it will create (initially) a "r2.0" branch.
The build server will also explicitly push the branch "r2" back to the origin.

If you want to hotfix a particular release, on the development server you can pull the respective branch (e.g. git pull origin r2) and switch to it (git checkout r2).
The nabu server needs to be restarted to see the new (or rather old) version of that is currently checked out in the hotfix branch. You restart your developer (if it was still open) and you can make any changes to the r2 release as you see fit.

Once done, commit everything to the r2 branch and push it upstream to origin.
At that point, if you are done hotfixing, you can switch back your development server to the master branch, restart the server and your developer and continue developing.

The build server will periodically check for updates on release branches, including r2 in our example. It will notice a commit that is beyond the last patch branch (r2.0) and create a new patch branch (r2.1).

## Web Interface

As mentioned a few times in the above, a management application is distributed along with the git logic, this allows you to easily manipulate the environment parameters.

[:.resources/builds.png]

On the left you can see your builds (remote or local projects you are already building) and below that the current projects living on the server. If a project has not been built locally yet, the "start build" button allows you to easily get started doing so.

You can release a project in developer by right clicking a project and hitting release. You can also release it by clicking the button "create release" in the management application.
The settings icon on the left allows you to perform some minor configuration for each project (e.g. the username/password to use for pushing and pulling).

Once you select a build, you can see its releases, they are sorted with most recent first. Click a release to see its patches and a patch to see its environments.

At that point you can also add an environment.

For each environment, you can download the zip which will contain the project with all the correct parameters for that environment. The zip also contains a build.xml file which describes the version and the dependencies that project has.

The meat of the story is of course the environment configuration, this is where you will be editing the environment specific parameters.

[:.resources/parameters1.png]

The build process will detect which parameters have changed in the dev environment since the last time you built. This could mean a new property was added which needs your attention or an existing property was altered. In most cases, if you change an environment parameter in development, a similar (though not identical) change will have to occur in other environments as well.

You can choose to only see artifacts with changes, in our experience 99% of the time you only need to look at those. Within each entry you can further filter on the specific properties that have changed or choose to see all the available properties.

Each property has an information icon which informs you of the current value it has in dev and the previous value it had in the current environment. The two buttons floating next to each field allow you to reset to those respectively.
Alternatively you just change the value to what you want.

### Conditional properties

Some properties are only relevant if another property has a certain value, for example take that "proxied" boolean in the above screenshot. Once you toggle it on, you will get additional properties that are simply not relevant if you haven't toggled this one:

[:.resources/parameters2.png]

### Build Folder

The folder that will be used to store your builds can be configured using ``git.build``.

### Finalizing

Once you are happy with your environment properties, you can hit "Build" in the top right corner. That will save your changes and merge them into the current environment branch.
You can then proceed to manually download the zip or you can switch to the accompanying module that allows you to combine projects into server images that are ready for automated rollout or testing.

Note that unless environment specific changes are required, this process can run fully automatically without human intervention, allowing you to integrate it into your continuous integration pipeline.