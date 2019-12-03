class CustomError extends Error {
    constructor(message, details) {
        super(message);
        this.name = this.constructor.name;
        this.details= details;
    }

    setDetails(details){
        Object.assign(this.details, details);
        return this;
    }

    status(code, expose){
        this.status= code;
        this.expose= expose;
        return this;
    }

    static fromJoiError(err, fn){
        const {message= err.message, ...details} = err.details && err.details[0] || {};
        return new this(message, fn? fn(details) : {value: details.context && details.context.value});
    }
}



class ValidationError extends CustomError {}
class ParamValidationError extends ValidationError {}
class QueryValidationError extends ValidationError {}
class BodyValidationError extends ValidationError {}
class PathValidationError extends ValidationError {}

class OperatorValidationError extends ValidationError {}

class FieldValidationError extends ValidationError {}

class FieldIdentifierError extends ValidationError {}
class FieldReferenceError extends ValidationError {}

module.exports={
    CustomError,
    ValidationError,
    ParamValidationError,
    OperatorValidationError,
    FieldIdentifierError,
    FieldValidationError,
    BodyValidationError,
    QueryValidationError,
    PathValidationError,
    FieldReferenceError
};
