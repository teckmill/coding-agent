from code_agent import CodingAgent

def main():
    # Create the coding agent (no API key needed)
    agent = CodingAgent()
    
    # Use a template for a web application
    web_app_code = agent.use_template("web_app", "flask")
    print("Generated Web App Code:")
    print(web_app_code)
    
    # Generate a linked list implementation
    data_structure_code = agent.use_template("data_structures", "linked_list")
    print("\nGenerated Data Structure Code:")
    print(data_structure_code)
    
    # Use a design pattern template
    pattern_code = agent.use_template("singleton", "python")
    print("\nGenerated Design Pattern Code:")
    print(pattern_code)

if __name__ == "__main__":
    main() 