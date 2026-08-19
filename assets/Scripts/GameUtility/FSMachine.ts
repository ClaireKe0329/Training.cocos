/**
 * 有限狀態機
 */
export class FSMachine<T>
{
    //執行一次的事件
    private _onceEvent: Map<T, ( dt: number ) => Promise<T>> = new Map<T, ( dt: number ) => Promise<T>>();
    //會不斷執行的事件
    private _foreverEvent: Map<T, ( dt: number ) => Promise<T>> = new Map<T, ( dt: number ) => Promise<T>>();
    //目前狀態
    private _currentState: T;
    //下個狀態
    private _nextState: T;
    //轉換旗標
    private transit: boolean = false;
    constructor( initState: T )
    {
        this._currentState = initState;
        this._nextState = initState;
    }

    //新增執行一次的事件
    public AddOnceEvent( event: T, fun: () => Promise<T> )
    {
        this._onceEvent.set( event, fun );
    }

    //刪除執行一次的事件
    public RemoveOnceEvent( event: T )
    {
        if ( this._onceEvent.has( event ) )
        {
            this._onceEvent.delete( event );
        }
    }

    //新增不斷執行的事件
    public AddForeverEvent( event: T, fun: () => Promise<T> )
    {
        this._foreverEvent.set( event, fun );
    }

    //刪除不斷執行的事件
    public RemoveForeverEvent( event: T )
    {
        if ( this._foreverEvent.has( event ) )
        {
            this._foreverEvent.delete( event );
        }
    }

    //狀態更新
    public async Tick( dt: number )
    {
        if ( this.transit )
        {
            this.CurrentState = this.NextState;
            this.transit = false;
            this._onceEvent.has( this.CurrentState ) && await this._onceEvent.get( this.CurrentState )( dt );
        }
        else
        {
            this._foreverEvent.has( this.CurrentState ) && await this._foreverEvent.get( this.CurrentState )( dt );
        }

        return this.CurrentState;
    }
    //設定下一個狀態
    set NextState( State: T )
    {
        this._nextState = State;
        this.transit = true;
    }
    //取得下一個狀態
    get NextState(): T
    {
        return this._nextState;
    }
    //取得目前狀態
    set CurrentState( State: T )
    {
        this._currentState = State;
    }

    //取得目前的狀態
    get CurrentState(): T
    {
        return this._currentState;
    }
}