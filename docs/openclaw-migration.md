# Bring Your OpenClaw Over To MRnObrainer

You do not need to translate your setup into raw config files to get started.

## The mental model

- Your main Mac stays the `Oracle`.
- Your existing OpenClaw machine becomes a `Worker`.
- MRnObrainer imports the host details, validates the connection, and gives you exact pairing commands.

## What the first release imports

- Hostname or IP
- Port
- User
- SSH key path when available
- Remote data path

## What the first release does not do

- It does not provision or mutate the remote host automatically.
- It does not silently overwrite your OpenClaw setup.
- It does not require hand-editing MRnObrainer internals.

## Migration steps

1. Open `Settings -> Connections -> OpenClaw Worker Import`.
2. Pick a detected host from SSH discovery or enter `user@host` manually.
3. Click `Test connection`.
4. Click `Import worker`.
5. Copy the generated pairing commands.
6. Run those commands on your remote host when you are ready.
7. Return to MRnObrainer and confirm the worker appears under `Oracle + Workers`.

## When to use a worker

- Long-running automations
- Stronger local models on a Mac mini or VM
- Background jobs you do not want competing with your active laptop session

## When to stay local

- Search and timeline recall
- Permission recovery
- First-pass planning and lightweight automations
