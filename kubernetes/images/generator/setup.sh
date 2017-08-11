#!/bin/bash
git clone ${REPOSITORY} susi_tweetbot
cd susi_tweetbot
git checkout ${BRANCH}

if [ -v COMMIT_HASH ]; then
    git reset --hard ${COMMIT_HASH}
fi

rm -rf .git
npm install --no-shrinkwrap
