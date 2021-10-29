set -eu

echo "Building Senses app distribution ..."
rm -rf .build
mkdir -p .build/senses
mkdir -p .build/senses/config.examples
cp -rv package.json yarn.lock manifest.json ecosystem.config.js bin lib runtime scripts .build/senses
cp -rv config/* .build/senses/config.examples
cd .build/senses
NODE_ENV="production" yarn
ln -sf /config/senses config
ln -sf /config/senses/certs certs
chmod +x bin/*
chmod +x scripts/*
cd -

if [ -d www ]; then
    echo "Found Senses GUI web files. Including them ..."
    cp -rv www .build/senses
    echo "NOTE: Don't forget to serve files in directory www/ via web server (like nginx)"
fi

cd .build
echo "Creating squashfs image ..."
mksquashfs senses/* senses.sqfs
cd -

echo "Publishing distribution files ..."
mkdir -p dist
cp .build/senses.sqfs dist/
ls -lah dist
echo "DONE! Files are published in dist/"
