import json
import sys
import os
from typing import Dict, Optional

class CodingAgent:
    def __init__(self):
        """Initialize the coding agent with built-in templates and patterns"""
        self.templates = self._load_templates()
        self.known_patterns = {
            "sort": self._generate_sort_code,
            "function": self._generate_function,
            "class": self._generate_class,
            "api": self._generate_api_endpoint,
        }
    
    def _load_templates(self) -> Dict:
        """Load code templates from templates directory"""
        templates = {}
        template_dir = os.path.join(os.path.dirname(__file__), "templates")
        if os.path.exists(template_dir):
            for file in os.listdir(template_dir):
                if file.endswith(".json"):
                    with open(os.path.join(template_dir, file), 'r') as f:
                        templates.update(json.load(f))
        return templates

    def _generate_sort_code(self, prompt: str, language: str) -> str:
        return "def bubble_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        for j in range(0, n-i-1):\n            if arr[j] > arr[j+1]:\n                arr[j], arr[j+1] = arr[j+1], arr[j]"

    def _generate_function(self, prompt: str, language: str) -> str:
        return f"def example_function():\n    # TODO: Implement {prompt}\n    pass"

    def _generate_class(self, prompt: str, language: str) -> str:
        return f"class Example:\n    def __init__(self):\n        # TODO: Implement {prompt}\n        pass"

    def _generate_api_endpoint(self, prompt: str, language: str) -> str:
        return "@app.route('/api/endpoint')\ndef api_endpoint():\n    return jsonify({'message': 'Hello, World!'})"

    def generate_code(self, prompt: str, language: str = "python") -> str:
        """Generate code based on the prompt and language"""
        prompt_lower = prompt.lower()
        
        # Try to match the prompt with known patterns
        for pattern, generator in self.known_patterns.items():
            if pattern in prompt_lower:
                return generator(prompt, language)
                
        # If no pattern matches, return a basic function template
        return self._generate_function(prompt, language)

    def use_template(self, template_type: str, subtype: str) -> str:
        """Use a predefined template"""
        try:
            return self.templates[template_type][subtype]
        except KeyError:
            return f"# Template not found for {template_type}/{subtype}"

def main():
    agent = CodingAgent()
    
    # Print initial message to indicate successful startup
    print(json.dumps({"status": "ready"}))
    sys.stdout.flush()

    while True:
        try:
            # Read input from stdin
            command = sys.stdin.readline().strip()
            if not command:
                continue

            # Parse command
            try:
                data = json.loads(command)
            except json.JSONDecodeError:
                print(json.dumps({"error": "Invalid JSON"}))
                sys.stdout.flush()
                continue

            # Process command
            if data.get("command") == "generate":
                result = agent.generate_code(
                    data.get("prompt", ""),
                    data.get("language", "python")
                )
                print(result)
            elif data.get("command") == "template":
                result = agent.use_template(
                    data.get("templateType", ""),
                    data.get("subtype", "")
                )
                print(result)
            else:
                print(json.dumps({"error": "Unknown command"}))
            
            sys.stdout.flush()

        except Exception as e:
            print(json.dumps({"error": str(e)}))
            sys.stdout.flush()

if __name__ == "__main__":
    main()