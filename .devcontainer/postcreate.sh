#!/bin/bash
mkdir /home/node/.homebridge && chown node /home/node/.homebridge
cp /workspaces/homebridge-loxone-proxy/.devcontainer/homebridge-config/* /home/node/.homebridge