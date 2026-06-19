import json
from channels.generic.websocket import AsyncWebsocketConsumer

class CodeEditorConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'editor_{self.room_name}'
        print(f"[WS CONNECT] Client connecting to room: {self.room_name}")

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        print(f"[WS CONNECT] Client accepted in room: {self.room_name}")

    async def disconnect(self, code):
        print(f"[WS DISCONNECT] Client disconnected from room: {self.room_name} with code: {code}")
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data=None, bytes_data=None):
        try:
            text_data_json = json.loads(text_data) if text_data else {}
            type_event = text_data_json.get('type')
            print(f"[WS RECEIVE] Received event '{type_event}' from client in room: {self.room_name}")

            if type_event == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
                return

            if type_event == 'code_change':
                content = text_data_json.get('content')
                filename = text_data_json.get('filename')
                sender = text_data_json.get('sender')

                # Send message to room group
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'code_sync',
                        'content': content,
                        'filename': filename,
                        'sender': sender
                    }
                )
            else:
                print(f"[WS RECEIVE] Broadcasting event '{type_event}' generically to room group: {self.room_group_name}")
                # Generic broadcast for all other collaboration events
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'group_broadcast',
                        'message': text_data_json
                    }
                )
        except json.JSONDecodeError:
            print("Invalid JSON received")

    # Receive message from room group
    async def code_sync(self, event):
        content = event['content']
        filename = event['filename']
        sender = event.get('sender')

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'code_sync',
            'content': content,
            'filename': filename,
            'sender': sender
        }))

    # Generic broadcast receiver from room group
    async def group_broadcast(self, event):
        message = event['message']
        type_event = message.get('type') if isinstance(message, dict) else 'unknown'
        print(f"[WS BROADCAST] Sending event '{type_event}' to WebSocket client in room: {self.room_name}")
        # Send message to WebSocket
        await self.send(text_data=json.dumps(message))
