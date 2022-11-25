let Memory = new class {
    memory = new Map;

    init(parameter) {
        set(parameter, null)
    };

    set(parameter, value) {
        this.memory.set(parameter, { value, filled: value != null });
    };

    get(parameter) {
        return this.memory.get(parameter).value;
    }

    [Symbol.iterator]() {
        return this.memory;
    };
}

