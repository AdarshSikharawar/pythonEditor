import json
from channels.generic.websocket import AsyncWebsocketConsumer

class CodeEditorConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'editor_{self.room_name}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            type_event = text_data_json.get('type')

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
